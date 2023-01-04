terraform {
  backend "s3" {
    bucket = "bi-terraform-app-states"
    region = "eu-west-1"
  }
  required_version = "~> 0.13"
}

provider "aws" {
  region = "eu-west-1"
}

provider "vault" {
  address = var.vault_address
}

data "aws_ecs_cluster" "redash_cluster" {
  cluster_name = var.cluster
}

data "vault_generic_secret" "redash" {
  path = local.vault_secret_path[terraform.workspace]
}
