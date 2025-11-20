pipeline {
  agent any

  environment {
    ACR_NAME  = 'elizadevopsacr'
    ACR_LOGIN = 'elizadevopsacr.azurecr.io'
    WEB_IMAGE = "${ACR_LOGIN}/web"
    API_IMAGE = "${ACR_LOGIN}/api"
    IMAGE_TAG = "${env.BUILD_NUMBER}"
  }

  stages {

    // =========================
    // 1. Забираем код
    // =========================
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    // =========================
    // 2. Node.js тесты (web + api)
    // =========================
    stage('Node tests (web & api)') {
      steps {
        dir('n-web') {
          sh '''
            npm ci
            npm run lint || true
            npm test || true
            # если когда-нибудь добавишь интеграционные тесты:
            npm run test:integration || true
          '''
        }
        dir('n-api') {
          sh '''
            npm ci
            npm run lint || true
            npm test || true
            npm run test:integration || true
          '''
        }
      }
    }

    // =========================
    // 3. Audit & deps security
    // =========================
    stage('Node security & deps audit') {
      steps {
        dir('n-web') {
          sh '''
            # security-аудит зависимостей
            npm audit --production || true
          '''
        }
        dir('n-api') {
          sh '''
            npm audit --production || true
          '''
        }
      }
    }

    // =========================
    // 4. Helm & Terraform checks
    // =========================
    stage('Helm & Terraform checks') {
      steps {
        sh '''
          echo "=== Helm lint ==="
          helm lint charts/web   || true
          helm lint charts/api   || true
          helm lint charts/mysql || true

          echo "=== Terraform fmt + validate (mysql-helm-tf) ==="
          cd mysql-helm-tf
          terraform init -backend=false -input=false
          terraform fmt -check
          terraform validate || true

          echo "=== Terraform fmt + validate (app-helm-tf) ==="
          cd ../app-helm-tf
          terraform init -backend=false -input=false
          terraform fmt -check
          terraform validate || true
        '''
      }
    }

    // =========================
    // 5. Terraform static analysis (tflint/tfsec через docker)
    // =========================
    stage('Terraform static analysis') {
      steps {
        sh '''
          # TFLint для mysql-helm-tf
          docker run --rm -v "$PWD/mysql-helm-tf:/data" -w /data ghcr.io/terraform-linters/tflint \
            || true

          # TFLint для app-helm-tf
          docker run --rm -v "$PWD/app-helm-tf:/data" -w /data ghcr.io/terraform-linters/tflint \
            || true

          # TFsec для всего репозитория
          docker run --rm -v "$PWD:/src" aquasec/tfsec /src \
            || true
        '''
      }
    }

    // =========================
    // 6. Docker build & push
    // =========================
    stage('Docker build & push') {
      steps {
        withCredentials([
          usernamePassword(
            credentialsId: 'acr-elizadevopsacr',
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

    // =========================
    // 7. Dockerfile lint + image scan
    // =========================
    stage('Docker lint & image scan') {
      steps {
        sh '''
          echo "=== Hadolint для Dockerfile'ов через docker ==="
          docker run --rm -v "$PWD/n-web:/workspace" hadolint/hadolint hadolint /workspace/Dockerfile || true
          docker run --rm -v "$PWD/n-api:/workspace" hadolint/hadolint hadolint /workspace/Dockerfile || true

          echo "=== Trivy scan образов (HIGH,CRITICAL) ==="
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy \
            image --severity HIGH,CRITICAL --exit-code 0 ${WEB_IMAGE}:${IMAGE_TAG} || true

          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy \
            image --severity HIGH,CRITICAL --exit-code 0 ${API_IMAGE}:${IMAGE_TAG} || true
        '''
      }
    }

    // =========================
    // 8. Обновляем GitOps values и пушим в GitHub
    // =========================
    stage('Update GitOps values (tags)') {
      steps {
        withCredentials([
          usernamePassword(
            credentialsId: 'github-elizadevops-token',
            usernameVariable: 'GIT_USER',
            passwordVariable: 'GIT_TOKEN'
          )
        ]) {
          sh '''
            git fetch origin
            git checkout -B main origin/main

            # Обновляем только values-файлы
            yq -i ".image.tag = \\"${IMAGE_TAG}\\"" gitops/values/web-values.yaml
            yq -i ".image.tag = \\"${IMAGE_TAG}\\"" gitops/values/api-values.yaml

            git config user.email "jenkins@local"
            git config user.name "jenkins-ci"

            git add gitops/values/web-values.yaml gitops/values/api-values.yaml
            git commit -m "Update images to tag ${IMAGE_TAG}" || echo "No changes to commit"

            # Пуш с токеном
            git push https://${GIT_USER}:${GIT_TOKEN}@github.com/elizadevops/aks-project.git main
          '''
        }
      }
    }

  } // конец stages
}   // конец pipeline
