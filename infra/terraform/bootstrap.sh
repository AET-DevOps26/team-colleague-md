#!/bin/bash
# Run once before terraform init. Requires: az CLI logged in (az login).
set -e

RESOURCE_GROUP="verita-tfstate-rg"
STORAGE_ACCOUNT="veritaterraformstate"   # globally unique, lowercase, 3-24 chars
CONTAINER_NAME="tfstate"
LOCATION="swedencentral"
SP_NAME="verita-terraform-sp"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

echo ">>> Creating resource group for Terraform state..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

echo ">>> Creating storage account..."
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --encryption-services blob \
  --output none

echo ">>> Creating blob container for state..."
az storage container create \
  --name "$CONTAINER_NAME" \
  --account-name "$STORAGE_ACCOUNT" \
  --output none

echo ">>> Creating service principal with Contributor role..."
SP_OUTPUT=$(az ad sp create-for-rbac \
  --name "$SP_NAME" \
  --role Contributor \
  --scopes "/subscriptions/$SUBSCRIPTION_ID" \
  --output json)

echo ""
echo "============================================"
echo " Add the following to GitHub Secrets:"
echo "============================================"
echo "ARM_CLIENT_ID:       $(echo "$SP_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['appId'])")"
echo "ARM_CLIENT_SECRET:   $(echo "$SP_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['password'])")"
echo "ARM_SUBSCRIPTION_ID: $SUBSCRIPTION_ID"
echo "ARM_TENANT_ID:       $(echo "$SP_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['tenant'])")"
echo ""
echo "============================================"
echo " Also add to GitHub Secrets:"
echo "============================================"
echo "VM_SSH_PUBLIC_KEY:   <content of your verita_key.pub>"
echo "AZURE_PRIVATE_KEY:   <content of your verita_key>"
echo ""
echo "============================================"
echo " Add to GitHub Variables (not Secrets):"
echo "============================================"
echo "AZURE_USER: azureuser"
echo "AZURE_PUBLIC_IP: <set this after terraform apply prints the VM IP>"
