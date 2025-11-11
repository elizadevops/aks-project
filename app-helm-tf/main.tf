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

variable "kubeconfig_path" {
  type = string
}

resource "helm_release" "api" {
  name       = "api"
  chart      = "../charts/api"
  namespace  = "default"
  timeout    = 300
  wait       = true
}

resource "helm_release" "web" {
  name       = "web"
  chart      = "../charts/web"
  namespace  = "default"
  timeout    = 300
  wait       = true
}
