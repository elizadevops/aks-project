locals {
  charts = var.charts_root
}
# MySQL (installed only if use_internal_mysql = true)
resource "helm_release" "mysql" {
  count = var.use_internal_mysql ? 1 : 0
  name = "mysql"
  namespace = var.namespace
  chart = "${local.charts}/mysql"

  values = [yamlencode({
    image = { repository = "mysql", tag = "8.0", pullPolicy = "IfNotPresent" }
    mysql = {
      database = "appdb"
      user = "Kaizen"
      password = var.db_password
      rootPassword = "rootpass"
    }
    storage = { size = "10Gi", storageClassName = "default" }
  })]
}
# API
resource "helm_release" "api" {
  name = "api"
  namespace = var.namespace
  chart = "${local.charts}/api"

  values = [yamlencode({
    image = {
      repository = "elizadevopsacr.azurecr.io/api"
      tag = var.api_image_tag
      pullPolicy = "IfNotPresent"
    }
    service = { type = "LoadBalancer", port = 3001, targetPort = 3001 }
    env = {
      DB_HOST = var.use_internal_mysql ? "mysql" : var.external_db_host
      DB_NAME = var.use_internal_mysql ? "appdb" : var.external_db_name
      DB_USER = var.use_internal_mysql ? "appuser" : var.external_db_user
    }
    secret = { DB_PASSWORD = var.db_password }
    autoscaling = { enabled = true, minReplicas = 1, maxReplicas = 3, targetCPUUtilizationPercentage = 70 }
  })]


  depends_on = [helm_release.mysql]
}


# WEB
resource "helm_release" "web" {
  name = "web"
  namespace = var.namespace
  chart = "${local.charts}/web"


  values = [yamlencode({
    image = {
      repository = "elizadevopsacr.azurecr.io/web"
      tag = var.web_image_tag
      pullPolicy = "IfNotPresent"
    }
    service = { type = "LoadBalancer", port = 80, targetPort = 3000 }
    env = {
      API_URL = "http://api-service:3001"
    }
    autoscaling = { enabled = true, minReplicas = 1, maxReplicas = 3, targetCPUUtilizationPercentage = 70 }
  })]

  depends_on = [helm_release.api]
}