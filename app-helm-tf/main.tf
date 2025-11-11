terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.31"
    }
  }
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

provider "helm" {
  kubernetes {
    config_path = var.kubeconfig_path
  }
}

resource "helm_release" "api" {
  name      = "api"
  chart     = "../charts/api"
  namespace = "default"
  wait      = true
  timeout   = 300
}

resource "helm_release" "web" {
  name      = "web"
  chart     = "../charts/web"
  namespace = "default"
  wait      = true
  timeout   = 300
}
