module "ref-doc" {
  source                = "./redashv10"
  name                  = var.service_name
  env                   = terraform.workspace
  dns_zone_name         = var.aws_route53_zone
  dns_record_name       = var.dns_record_name
  vpc_id                = var.vpc_id
  ecs_cluster_name      = data.aws_ecs_cluster.redash_cluster.id
  service_desired_count = var.instance_count

  ecs_task_settings = {
    webapp_image                = var.image_url
    worker_image                = var.image_url
    scheduler_image             = var.image_url
    nginx_image                 = var.nginx_image_url
    webapp_cpu                  = var.webapp_cpu[terraform.workspace]
    webapp_memory               = var.webapp_memory[terraform.workspace]
    worker_cpu                  = var.worker_cpu[terraform.workspace]
    worker_memory               = var.worker_memory[terraform.workspace]
    scheduler_cpu               = var.scheduler_cpu[terraform.workspace]
    scheduler_memory            = var.scheduler_memory[terraform.workspace]
    nginx_cpu                   = var.nginx_cpu[terraform.workspace]
    nginx_memory                = var.nginx_memory[terraform.workspace]
    database_secretmanager_path = local.database_url[terraform.workspace]
    redis_url                   = local.redis_url[terraform.workspace]
    email_user                  = data.vault_generic_secret.redash.data["email_user"]
    email_sender_addr           = "data@auto1.team"
    worker_threads_count        = local.worker_threads_count[terraform.workspace]

  }

  ecs_task_secrets = {
    database_secretmanager_path = local.database_url[terraform.workspace]
    webapp_cookie_secret        = local.webapp_cookie_secret[terraform.workspace]
    email_password              = local.email_password[terraform.workspace]
  }

  lb_settings = {
    http_listener_arn  = var.alb_http_listener_arn
    https_listener_arn = var.alb_https_listener_arn

    health_check_path    = "/status.json"
    health_check_matcher = "200-499"
  }
}
