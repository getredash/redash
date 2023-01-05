module "ref-doc" {
  source                = "git@github.com:wkda/ops-tf-module-redash.git?ref=master"
  name                  = var.service_name
  env                   = terraform.workspace
  dns_zone_name         = var.aws_route53_zone
  dns_record_name       = var.dns_record_name
  vpc_id                = var.vpc_id
  ecs_cluster_name      = data.aws_ecs_cluster.redash_cluster.id
  service_desired_count = var.instance_count

  ecs_task_settings = {
    webapp_image         = var.image_url
    worker_image         = var.image_url
    scheduler_image      = var.image_url
    nginx_image          = "${var.nginx_image_url}:latest"
    database_secretmanager_path         = local.database_url[terraform.workspace]
    redis_url            = local.redis_url[terraform.workspace]
    email_user           = data.vault_generic_secret.redash.data["email_user"]
    email_sender_addr    = "data@auto1.team"
    worker_threads_count = local.worker_threads_count[terraform.workspace]
    database_secretmanager_path =

  }

  ecs_task_secrets = {
    database_url         = local.database_url[terraform.workspace]
    webapp_cookie_secret = local.webapp_cookie_secret[terraform.workspace]
    email_password       = local.email_password[terraform.workspace]
  }

  lb_settings = {
    http_listener_arn  = var.alb_http_listener_arn
    https_listener_arn = var.alb_https_listener_arn
  }
}
