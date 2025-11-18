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

    stage('Docker build & push') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'acr-admin',          // ID кредов ACR в Jenkins
          usernameVariable: 'ACR_USER',
          passwordVariable: 'ACR_PASS'
        )]) {
          sh '''
            echo "$ACR_PASS" | docker login ${ACR_LOGIN} -u "$ACR_USER" --password-stdin

            docker build -t ${WEB_IMAGE}:${IMAGE_TAG} ./n-web
            docker build -t ${API_IMAGE}:${IMAGE_TAG} ./n-api

            docker push ${WEB_IMAGE}:${IMAGE_TAG}
            docker push ${API_IMAGE}:${IMAGE_TAG}
          '''
        }
      }
    }

    stage('Update GitOps values (tags)') {
      steps {
        sh '''
          # yq для обновления values
          sudo curl -L https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 \
            -o /usr/local/bin/yq
          sudo chmod +x /usr/local/bin/yq

          # Обновляем теги образов
          yq -i ".image.tag = \\"${IMAGE_TAG}\\"" gitops/values/web-values.yaml
          yq -i ".image.tag = \\"${IMAGE_TAG}\\"" gitops/values/api-values.yaml

          git config user.email "jenkins@local"
          git config user.name "jenkins-ci"

          git status
          git commit -am "Update images to tag ${IMAGE_TAG}" || echo "No changes"

          # Важно: на этом шаге Jenkins должен иметь доступ к GitHub (ssh ключ или https+token)
          git push
        '''
      }
    }
  }
}
