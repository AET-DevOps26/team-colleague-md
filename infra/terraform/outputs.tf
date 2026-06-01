output "vm_public_ip" {
  description = "Public IP of the Verita VM — copy this to AZURE_PUBLIC_IP GitHub Variable"
  value       = azurerm_public_ip.main.ip_address
}

output "vm_ssh_command" {
  description = "SSH command for manual access"
  value       = "ssh -i verita_key ${var.admin_username}@${azurerm_public_ip.main.ip_address}"
}
