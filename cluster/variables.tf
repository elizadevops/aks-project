variable "subscription_id" {
  description = "Azure Subscription ID (можно опустить, если используешь az login и активную подписку)"
  type        = string
  default     = "d891a168-461a-423a-9e4f-f98ecd66bc7c"
}

variable "tenant_id" {
  description = "Azure Tenant ID (можно опустить при az login)"
  type        = string
  default     = "a8873f8d-7eee-4284-b53f-76ab69cd8e44"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "westus"
}

variable "resource_group_name" {
  description = "Имя Resource Group"
  type        = string
  default     = "aks-resources"
}

variable "cluster_name" {
  description = "Имя AKS кластера"
  type        = string
  default     = "my-aks-cluster"
}

variable "dns_prefix" {
  description = "DNS префикс для AKS"
  type        = string
  default     = "aksdemo"
}

variable "kubernetes_version" {
  description = "Версия Kubernetes (укажи поддерживаемую минорную, например 1.30)"
  type        = string
  default     = "1.30"
}

variable "node_count" {
  description = "Количество узлов по умолчанию"
  type        = number
  default     = 2
}

variable "node_size" {
  description = "Тип VM для узлов"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "vnet_cidr"   { default = "10.0.0.0/16" }
variable "subnet_cidr" { default = "10.0.1.0/24" }


