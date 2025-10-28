variable "resource_group_location" {
  type        = string
  default     = "westus3"
  description = "Location of the resource group."
}

variable "resource_group_name_prefix" {
  type        = string
  default     = "rg-aks"
  description = "Prefix of the resource group name that's combined with a random ID so name is unique in your Azure subscription."
}

variable "node_count" {
  type        = number
  description = "The initial quantity of nodes for the node pool."
  default     = 1
}

variable "node_min_count" {
  type        = number
  default     = 1
}

variable "node_max_count" {
  type        = number
  default     = 3
}

variable "username" {
  type        = string
  description = "The admin username for the new cluster."
  default     = "azureuser"
}

variable "available_zones" {
  type    = list(string)
  default = ["1", "2", "3"]
}

variable "tags" {
  type        = map(string)
  default     = { project = "nodejs-3tier", env = "dev" }
}