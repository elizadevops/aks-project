pipeline {
  agent any

  environment {
    ACR_NAME      = 'elizadevopsacr'
    ACR_LOGIN     = 'elizedevopsacr.azurecr.io'
    WEB_IMAGE     = "${ACR_LOGIN}/web"
    API_IMAGE     = "${ACR_LOGIN}/api"
    GITOPS_REPO   = 'git@github.com:YOUR_ORG/gitops-repo.git'
    GITOPS_PATH   = 'envs/prod' // где лежат values для ArgoCD
    IMAGE_TAG     = "${env.BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install tools') {
      steps {
        sh '''
          node -v || true
          npm -v || true
        '''
      }
    }

    stage('Web: lint & test') {
      steps {
        dir('web') {
          sh '''
            npm ci
            npm run lint || true
            npm test || true
          '''
        }
      }
    }

    stage('API: lint & test') {
      steps {
        dir('api') {
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
          helm lint charts/web || true
          helm lint charts/api || true
          helm lint charts/mysql || true

          cd mysql-helm-tf
          terraform fmt -check
          terraform validate
          cd ../app-helm-tf
          terraform fmt -check
          terraform validate
        '''
      }
    }

    stage('Docker build & push') {
      steps {
        sh '''
          az acr login --name ${ACR_NAME}

          docker build -t ${WEB_IMAGE}:${IMAGE_TAG} ./web
          docker build -t ${API_IMAGE}:${IMAGE_TAG} ./api

          docker push ${WEB_IMAGE}:${IMAGE_TAG}
          docker push ${API_IMAGE}:${IMAGE_TAG}
        '''
      }
    }

    stage('Update GitOps manifests') {
      steps {
        sshagent (credentials: ['gitops-ssh-key']) {
          sh '''
            rm -rf gitops-repo
            git clone ${GITOPS_REPO} gitops-repo
            cd gitops-repo/${GITOPS_PATH}

            # пример: обновляем values-prod.yaml
            yq -i '.web.image.tag = "${IMAGE_TAG}"' values-prod.yaml
            yq -i '.api.image.tag = "${IMAGE_TAG}"' values-prod.yaml

            git config user.email "ci@local"
            git config user.name "jenkins-ci"
            git commit -am "Update images to tag ${IMAGE_TAG}" || echo "No changes"
            git push
          '''
        }
      }
    }
  }

  post {
    always {
      junit allowEmptyResults: true, testResults: '**/junit-report.xml'
    }
  }
}
