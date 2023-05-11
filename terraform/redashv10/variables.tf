variable "name" {
  type = string
}

variable "env" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "dns_zone_name" {
  type = string
}

variable "dns_record_name" {
  type = string
}

variable "ecs_cluster_name" {
  type    = string
  default = ""
}

variable "ecs_task_settings" {
  type = map(string)
}

variable "ecs_task_secrets" {
  type = map(string)
}

variable "lb_settings" {
  type = map(string)
}

variable "ecs_execution_role_policy_arns" {
  type    = set(string)
  default = ["arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"]
}

variable "service_desired_count" {
  type    = number
  default = 1
}

variable "deployment_minimum_healthy_percent" {
  type    = number
  default = 100
}

variable "deployment_maximum_percent" {
  type    = number
  default = 200
}
variable "capacity_provider_strategy" {
  type    = list(map(string))
  default = []
}
variable "deployment_controller" {
  type    = list(map(string))
  default = []
}

variable "placement_constraints_instance_type" {
  default = ""
}

locals {
  service_dns_name        = "${var.dns_record_name}.${var.dns_zone_name}"
  webapp_image            = lookup(var.ecs_task_settings, "webapp_image")
  webapp_cpu              = lookup(var.ecs_task_settings, "webapp_cpu", 32)
  webapp_memory           = lookup(var.ecs_task_settings, "webapp_memory", 256)
  bootstrap_cpu           = lookup(var.ecs_task_settings, "bootstrap_cpu", 32)
  bootstrap_memory        = lookup(var.ecs_task_settings, "bootstrap_memory", 128)
  webapp_threads_count    = lookup(var.ecs_task_settings, "webapp_threads_count", 1)
  worker_image            = lookup(var.ecs_task_settings, "worker_image")
  worker_cpu              = lookup(var.ecs_task_settings, "worker_cpu", 32)
  worker_memory           = lookup(var.ecs_task_settings, "worker_memory", 256)
  worker_threads_count    = lookup(var.ecs_task_settings, "worker_threads_count", 1)
  scheduler_image         = lookup(var.ecs_task_settings, "scheduler_image")
  scheduler_cpu           = lookup(var.ecs_task_settings, "scheduler_cpu", 32)
  scheduler_memory        = lookup(var.ecs_task_settings, "scheduler_memory", 256)
  scheduler_threads_count = lookup(var.ecs_task_settings, "scheduler_threads_count", 1)
  nginx_image             = lookup(var.ecs_task_settings, "nginx_image")
  nginx_cpu               = lookup(var.ecs_task_settings, "nginx_cpu", 32)
  nginx_memory            = lookup(var.ecs_task_settings, "nginx_memory", 256)
  nginx_port              = lookup(var.ecs_task_settings, "nginx_port", 80)
  redis_url               = lookup(var.ecs_task_settings, "redis_url", "-")
  email_user              = lookup(var.ecs_task_settings, "email_user", "-")
  email_sender_addr       = lookup(var.ecs_task_settings, "email_sender_addr", "email@d.omain")

  webapp_cookie_secret_arn = aws_ssm_parameter.secrets["webapp_cookie_secret"].arn
  database_url_arn         = aws_ssm_parameter.secrets["database_secretmanager_path"].arn
  email_password_arn       = aws_ssm_parameter.secrets["email_password"].arn

  deregistration_delay                = lookup(var.lb_settings, "deregistration_delay", 60)
  health_check_path                   = lookup(var.lb_settings, "health_check_path", "/")
  health_check_healthy_threshold      = lookup(var.lb_settings, "health_check_healthy_threshold", 3)
  health_check_unhealthy_threshold    = lookup(var.lb_settings, "health_check_unhealthy_threshold", 2)
  health_check_timeout                = lookup(var.lb_settings, "health_check_timeout", 5)
  health_check_interval               = lookup(var.lb_settings, "health_check_interval", 30)
  health_check_matcher                = lookup(var.lb_settings, "health_check_matcher", "200")
  http_listener_arn                   = lookup(var.lb_settings, "http_listener_arn", "")
  https_listener_arn                  = lookup(var.lb_settings, "https_listener_arn", "")
  placement_constraints_instance_type = var.placement_constraints_instance_type
}
