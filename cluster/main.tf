# Generate random resource group name
resource "random_pet" "rg_name" {
  prefix = var.resource_group_name_prefix
}

resource "azurerm_resource_group" "rg" {
  location = var.resource_group_location
  name     = random_pet.rg_name.id
  tags = var.tags
}

resource "random_pet" "aks_name" {
  prefix = "cluster"
}

resource "random_pet" "azurerm_kubernetes_cluster_dns_prefix" {
  prefix = "dns"
}

resource "azurerm_kubernetes_cluster" "k8s" {
  location            = azurerm_resource_group.rg.location
  name                = random_pet.azurerm_kubernetes_cluster_name.id
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = random_pet.azurerm_kubernetes_cluster_dns_prefix.id

  identity {
    type = "SystemAssigned"
  }
  role_based_access_control_enabled = true
  oidc_issuer_enabled               = true

  default_node_pool {
    name       = "sysnp"
    vm_size    = "Standard_D2s_v5"
    node_count = var.node_count
    enable_auto_scaling          = true
    min_count                    = var.node_min_count
    max_count                    = var.node_max_count
    only_critical_addons_enabled = true
    type                         = "VirtualMachineScaleSets"

    dynamic "availability_zones" {
      for_each = length(var.availability_zones) > 0 ? [1] : []
      content  = var.availability_zones
    }  
    node_labels = {
      "role" = "system"
    }  
  }
  network_profile {
    network_plugin     = "azure"
    load_balancer_sku  = "standard"
    outbound_type      = "loadBalancer"
  }

  dynamic "api_server_access_profile" {
    for_each = length(var.authorized_ip_ranges) > 0 ? [1] : []
    content {
      authorized_ip_ranges = var.authorized_ip_ranges
    }
  }

  # Linux профиль с ключом, сгенерированным в ssh.tf
  linux_profile {
    admin_username = var.username

    ssh_key {
      key_data = azapi_resource_action.ssh_public_key_gen.output.publicKey
    }
  }

  # полезно игнорировать незначимые апгрейды версии k8s с точки зрения TF
  lifecycle {
    ignore_changes = [
      default_node_pool[0].node_count
    ]
  }
}

# --- (опц.) выдать кластеру доступ к ACR для pull приватных образов ---
# Укажи attach_acr_id (например, "/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.ContainerRegistry/registries/<acr>")
resource "azurerm_role_assignment" "acr_pull" {
  count               = var.attach_acr_id == null ? 0 : 1
  scope               = var.attach_acr_id == null ? "" : var.attach_acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.k8s.kubelet_identity[0].object_id
} 