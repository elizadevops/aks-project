# kubeconfig в raw-формате — можно записать в файл
output "kube_config" {
  description = "Kubeconfig (raw) для подключения kubectl"
  value       = azurerm_kubernetes_cluster.aks.kube_config_raw
  sensitive   = true
}

output "cluster_name" {
  value       = azurerm_kubernetes_cluster.aks.name
  description = "Имя кластера"
}

output "resource_group_name" {
  value       = azurerm_resource_group.rg.name
  description = "RG, где создан кластер"
}

output "aks_fqdn" {
  value       = azurerm_kubernetes_cluster.aks.fqdn
  description = "FQDN API сервера"
}

