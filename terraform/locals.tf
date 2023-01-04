locals {
  vault_secret_path = {
    qa   = "secret/bi/apps/redashv10"
    prod = "-"
  }

  # ${data.terraform_remote_state.rds.outputs.dns}
  database_url = {
    qa   = data.vault_generic_secret.redash.data["database_url"]
    prod = "-"

  }
  redis_url = {
    qa   = "redis://redash-bi.qa.ecache.bi-qa.wkda:6379"
    prod = "-"

  }

  webapp_cookie_secret = {
    qa   = data.vault_generic_secret.redash.data["webapp_cookie_secret"]
    prod = "-"
  }

  email_password = {
    qa   = data.vault_generic_secret.redash.data["email_password"]
    prod = "-"
  }

  worker_threads_count = {
    qa   = 1
    prod = 3
  }

  # capacity_provider_strategy = {
  #   qa = [
  #     {
  #       base              = 0
  #       capacity_provider = data.terraform_remote_state.ecs.outputs.cluster_name
  #       weight            = 100
  #     }
  #   ]
  #   prod = [
  #     {
  #       base              = 0
  #       capacity_provider = "eu-bi-prod-asg-apps-2"
  #       weight            = 100
  #   }]
  # }
}
