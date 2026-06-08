variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "swedencentral"
}

variable "vm_size" {
  description = "Azure VM size"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "project_name" {
  description = "Prefix applied to all resource names"
  type        = string
  default     = "verita"
}

variable "admin_username" {
  description = "VM admin username (must match AZURE_USER GitHub Variable)"
  type        = string
  default     = "azureuser"
}

variable "ssh_public_key" {
  description = "SSH public key placed in VM authorized_keys (set via TF_VAR or tfvars)"
  type        = string
  sensitive   = true
}
