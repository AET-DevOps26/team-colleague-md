terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  # State stored in Azure Blob Storage (created by bootstrap.sh)
  backend "azurerm" {
    resource_group_name  = "verita-tfstate-rg"
    storage_account_name = "veritaterraformarpad"
    container_name       = "tfstate"
    key                  = "verita.terraform.tfstate"
  }
}

provider "azurerm" {
  features {}
}
