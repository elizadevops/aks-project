############################
# Базовая инфраструктура
############################

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_virtual_network" "vnet" {
  name                = "aks-vnet"
  address_space       = [var.vnet_cidr]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_subnet" "nodes" {
  name                 = "aks-nodes-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [var.subnet_cidr]

}

############################
# AKS кластер
############################

resource "azurerm_kubernetes_cluster" "aks" {
  name                = var.cluster_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  # Рекомендуется указывать минорную версию (например, "1.30")
  kubernetes_version  = var.kubernetes_version
  dns_prefix          = var.dns_prefix

  identity {
    type = "SystemAssigned"
  }

  # Встроенный RBAC + OIDC (для будущих workload identity)
  role_based_access_control_enabled = true
  oidc_issuer_enabled               = true

  # Профиль сети AKS (Azure CNI)
  network_profile {
  network_plugin = "azure"
  service_cidr   = "10.200.0.0/16"
  dns_service_ip = "10.200.0.10"  # внутри service_cidr — всё ок
  }


  default_node_pool {
    name           = "sysnp"
    vm_size        = var.node_size
    node_count     = var.node_count
    vnet_subnet_id = azurerm_subnet.nodes.id
    type           = "VirtualMachineScaleSets"
    only_critical_addons_enabled = false
    orchestrator_version         = var.kubernetes_version
    os_disk_type                 = "Managed"
  }

  linux_profile {
  admin_username = "azureuser"
  ssh_key {
    key_data = trimspace(tls_private_key.ssh_key.public_key_openssh)
  }
}

  lifecycle {
    ignore_changes = [
      # Чтобы не дёргался при минорных автопатчах
      kubernetes_version,
      default_node_pool[0].orchestrator_version
    ]
  }
}
