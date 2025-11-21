pipeline {
  agent any

  environment {
    ACR_NAME  = 'elizedevopsacr'
    ACR_LOGIN = 'elizedevopsacr.azurecr.io'
    WEB_IMAGE = "${ACR_LOGIN}/web"
    API_IMAGE = "${ACR_LOGIN}/api"
    IMAGE_TAG = "${env.BUILD_NUMBER}"

    // SonarCloud token из Credentials (Secret text, ID = sonarcloud-token)
    SONAR_TOKEN = credentials('sonarcloud-token')
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Node tests (web & api)') {
      steps {
        dir('n-web') {
          sh '''
            npm ci
            npm run lint || true
            npm test || true
          '''
        }
        dir('n-api') {
          sh '''
            npm ci
            npm run lint || true
            npm test || true
          '''
        }
      }
    }

    stage('npm audit (security check)') {
      steps {
        dir('n-web') {
          sh '''
            echo "Running npm audit for n-web..."
            npm audit --audit-level=high || true
          '''
        }
        dir('n-api') {
          sh '''
            echo "Running npm audit for n-api..."
            npm audit --audit-level=high || true
          '''
        }
      }
    }

    // 🔹 Trivy: файловый скан (репозиторий, зависимости, конфиги)
    stage('Trivy FS scan') {
      steps {
        sh '''
          echo "Running Trivy filesystem scan (HIGH,CRITICAL)..."
          # Скан всего репозитория. --exit-code 0 чтобы не падал pipeline, но находил уязвимости.
          trivy fs --severity HIGH,CRITICAL --exit-code 0 .
        '''
      }
    }

    // 🔹 Trivy: IaC config scan (Terraform + Helm + K8s)
    stage('Trivy IaC config scan') {
      steps {
        sh '''
          echo "Running Trivy IaC config scan (Terraform + Helm + K8s)..."
          trivy config --severity HIGH,CRITICAL --exit-code 0 .
        '''
      }
    }

    stage('Helm & Terraform checks') {
      steps {
        sh '''
          # Helm lint
          helm lint charts/web   || true
          helm lint charts/api   || true
          helm lint charts/mysql || true

          # ===== mysql-helm-tf =====
          cd mysql-helm-tf
          terraform init -backend=false -input=false
          terraform fmt -check
          terraform validate || true

          # ===== app-helm-tf =====
          cd ../app-helm-tf
          terraform init -backend=false -input=false
          terraform fmt -check
          terraform validate || true
        '''
      }
    }

    // 🔹 SonarCloud анализ
    stage('SonarCloud Analysis') {
      environment {
        SONAR_SCANNER_OPTS = '-Xmx512m'
      }
      steps {
        withSonarQubeEnv('sonarcloud') {
          script {
            // имя сканера должно совпадать с Global Tool Configuration
            def scannerHome = tool 'sonarscanner'

            sh """
              echo "Running SonarCloud analysis..."
              "${scannerHome}/bin/sonar-scanner" \
                -Dsonar.projectKey=aks-project \
                -Dsonar.organization=elizadevops \
                -Dsonar.sources=. \
                -Dsonar.exclusions=**/node_modules/**,**/charts/**,**/mysql-helm-tf/**,**/app-helm-tf/**,**/gitops/**
            """
          }
        }
      }
    }

    // 🔹 SonarCloud Quality Gate (не падаем на NONE)
    stage('SonarCloud Quality Gate') {
      steps {
        timeout(time: 3, unit: 'MINUTES') {
          script {
            def qg = waitForQualityGate()
            echo "SonarCloud Quality Gate status: ${qg.status}"

            if (qg.status == 'FAILED' || qg.status == 'ERROR') {
              error "Pipeline aborted due to SonarCloud quality gate: ${qg.status}"
            }
            // Если статус NONE или OK — просто продолжаем
          }
        }
      }
    }

    stage('Docker build & push') {
      steps {
        withCredentials([
          usernamePassword(
            credentialsId: 'acr-elizedevopsacr',
            usernameVariable: 'ACR_USER',
            passwordVariable: 'ACR_PASS'
          )
        ]) {
          sh '''
            echo "$ACR_PASS" | docker login ${ACR_LOGIN} -u "$ACR_USER" --password-stdin

            docker build -t ${WEB_IMAGE}:${IMAGE_TAG} ./n-web
            docker build -t ${API_IMAGE}:${IMAGE_TAG} ./n-api

            docker push ${WEB_IMAGE}:${IMAGE_TAG}
            docker push ${API_IMAGE}:${IMAGE_TAG}

            docker logout ${ACR_LOGIN} || true
          '''
        }
      }
    }

    // 🔹 Trivy: скан Docker-образов web и api
    stage('Trivy Image scan') {
      steps {
        sh '''
          echo "Running Trivy image scan for WEB and API images (HIGH,CRITICAL)..."
          trivy image --severity HIGH,CRITICAL --exit-code 0 ${WEB_IMAGE}:${IMAGE_TAG}
          trivy image --severity HIGH,CRITICAL --exit-code 0 ${API_IMAGE}:${IMAGE_TAG}
        '''
      }
    }

    stage('Update GitOps values (tags)') {
      steps {
        withCredentials([
          usernamePassword(
            credentialsId: 'github-elizedevops-token',
            usernameVariable: 'GIT_USER',
            passwordVariable: 'GIT_TOKEN'
          )
        ]) {
          sh '''
            git fetch origin
            git checkout -B main origin/main

            yq -i ".image.tag = \\"${IMAGE_TAG}\\"" gitops/values/web-values.yaml
            yq -i ".image.tag = \\"${IMAGE_TAG}\\"" gitops/values/api-values.yaml

            git config user.email "jenkins@local"
            git config user.name "jenkins-ci"

            git add gitops/values/web-values.yaml gitops/values/api-values.yaml
            git commit -m "Update images to tag ${IMAGE_TAG}" || echo "No changes to commit"

            git push https://x-access-token:${GIT_TOKEN}@github.com/elizadevops/aks-project.git main
          '''
        }
      }
    }

  } // конец stages
} // конец pipeline
