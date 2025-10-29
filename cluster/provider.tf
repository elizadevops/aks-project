terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 4.16.0, < 5.0.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = ">= 4.0.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5.0"
    }
  }
}

provider "azurerm" {
  features {}

  # Если используешь az login — эти поля можно не указывать.
  # Иначе передай через variables.tfvars или переменные окружения.
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
}
