data "aws_ecs_cluster" "this" {
  cluster_name = var.ecs_cluster_name
}

data "aws_region" "current" {}

data "template_file" "this" {
  template = local.launch_type == "FARGATE" ? file("${path.module}/files/task-fargate.json") : file("${path.module}/files/task.json")

  vars = {
    log_driver = jsonencode(local.log_driver)

    webapp_image                 = local.webapp_image
    webapp_cpu                   = local.webapp_cpu
    webapp_memory                = local.webapp_memory
    environment_variables_webapp = jsonencode(local.environment_variables_webapp)
    webapp_log_options           = replace(jsonencode(local.log_options), "$${container_name}$", "webapp")
    bootstrap_log_options        = replace(jsonencode(local.log_options), "$${container_name}$", "boostrap")

    worker_image                 = local.worker_image
    worker_cpu                   = local.worker_cpu
    worker_memory                = local.worker_memory
    environment_variables_worker = jsonencode(local.environment_variables_worker)
    worker_log_options           = replace(jsonencode(local.log_options), "$${container_name}$", "worker")

    scheduler_image                 = local.scheduler_image
    scheduler_cpu                   = local.scheduler_cpu
    scheduler_memory                = local.scheduler_memory
    environment_variables_scheduler = jsonencode(local.environment_variables_scheduler)
    scheduler_log_options           = replace(jsonencode(local.log_options), "$${container_name}$", "scheduler")

    nginx_image                 = local.nginx_image
    nginx_port                  = local.nginx_port
    nginx_cpu                   = local.nginx_cpu
    nginx_memory                = local.nginx_memory
    environment_variables_nginx = jsonencode(local.nginx_vars)
    nginx_log_options           = replace(jsonencode(local.log_options), "$${container_name}$", "nginx")

    redis_image       = local.redis_image
    redis_cpu         = local.redis_cpu
    redis_memory      = local.redis_memory
    redis_log_options = replace(jsonencode(local.log_options), "$${container_name}$", "redis")
    nginx_host_port   = local.launch_type == "FARGATE" ? local.nginx_port : 0
    secrets           = jsonencode(local.secrets)
  }
}

resource "aws_ecs_task_definition" "this" {
  family                   = var.name
  container_definitions    = data.template_file.this.rendered
  execution_role_arn       = aws_iam_role.execution.arn
  requires_compatibilities = local.requires_compatibilities
  network_mode             = local.network_mode
  tags                     = local.tags
  cpu                      = local.task_cpu
  memory                   = local.task_memory
}

resource "aws_ecs_service" "this" {
  name                               = var.name
  cluster                            = data.aws_ecs_cluster.this.arn
  task_definition                    = aws_ecs_task_definition.this.arn
  desired_count                      = var.service_desired_count
  deployment_maximum_percent         = var.deployment_maximum_percent
  deployment_minimum_healthy_percent = var.deployment_minimum_healthy_percent
  wait_for_steady_state              = var.wait_for_steady_state
  launch_type                        = local.launch_type == "" ? null : local.launch_type
  force_new_deployment               = local.is_capacity_provider_enabled ? true : var.force_new_deployment

  dynamic "ordered_placement_strategy" {
    for_each = local.ordered_placement_strategies
    content {
      type  = ordered_placement_strategy.value.type
      field = ordered_placement_strategy.value.field
    }
  }

  dynamic "capacity_provider_strategy" {
    for_each = local.is_capacity_provider_enabled ? local.capacity_provider_strategies : []
    content {
      base              = lookup(capacity_provider_strategy.value, "base", 0)
      capacity_provider = capacity_provider_strategy.value.capacity_provider
      weight            = lookup(capacity_provider_strategy.value, "weight", 100)
    }
  }

  dynamic "network_configuration" {
    for_each = var.network_configuration
    content {
      subnets          = network_configuration.value.subnets
      security_groups  = network_configuration.value.security_groups
      assign_public_ip = lookup(network_configuration.value, "assign_public_ip", false)
    }
  }

  load_balancer {
    target_group_arn = aws_alb_target_group.this.arn
    container_name   = "nginx"
    container_port   = local.nginx_port
  }

  depends_on = [
  aws_alb_target_group.this]
}
