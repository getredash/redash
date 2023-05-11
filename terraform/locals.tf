locals {
  vault_secret_path = {
    qa   = "secret/bi/apps/redashv10"
    prod = "secret/bi/apps/redashv10"
  }

  database_url = {
    qa   = data.vault_generic_secret.redash.data["database_url"]
    prod = data.vault_generic_secret.redash.data["database_url"]

  }
  redis_url = {
    qa   = "redis://redash-bi.qa.ecache.bi-qa.wkda:6379"
    prod = "redis://redash-bi.prod.ecache.bi-prod.wkda:6379"

  }

  webapp_cookie_secret = {
    qa   = data.vault_generic_secret.redash.data["webapp_cookie_secret"]
    prod = data.vault_generic_secret.redash.data["webapp_cookie_secret"]
  }

  email_password = {
    qa   = data.vault_generic_secret.redash.data["email_password"]
    prod = data.vault_generic_secret.redash.data["email_password"]
  }

  worker_threads_count = {
    qa   = 1
    prod = 15
  }

  scheduler_threads_count = {
    qa   = 1
    prod = 4
  }

  webapp_threads_count = {
    qa   = 1
    prod = 4
  }



  worker_cpu = {
    qa   = 1024
    prod = 1024
  }
  worker_memory = {
    qa   = 2048
    prod = 20000
  }

  scheduler_cpu = {
    qa   = 1024
    prod = 1230
  }
  scheduler_memory = {
    qa   = 2048
    prod = 2048
  }

  webapp_cpu = {
    qa   = 1024
    prod = 1024
  }
  webapp_memory = {
    qa   = 2048
    prod = 4096
  }

  nginx_cpu = {
    qa   = 32
    prod = 128
  }
  nginx_memory = {
    qa   = 256
    prod = 1024
  }

  capacity_provider_strategy = {
    qa = [
      {
        base              = 0
        capacity_provider = var.capacity_provider
        weight            = 100
      }
    ]
    prod = [
      {
        base              = 0
        capacity_provider = var.capacity_provider
        weight            = 100
    }]
  }
}
