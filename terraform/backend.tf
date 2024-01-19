terraform {
  backend "s3" {
    bucket         = "masterworks-terraform-prod"
    key            = "github-actions/infrastructure/terraform/development/redash/terraform.tfstate"
    dynamodb_table = "terraform-lock-prod"
    region         = "us-east-2"
    encrypt        = true
  }
}
