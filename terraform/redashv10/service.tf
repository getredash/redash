

data "aws_ecs_cluster" "this" {
  cluster_name = var.ecs_cluster_name
}

data "template_file" "this" {
  template = file("${path.module}/files/task.json")

  vars = {
    service_name         = var.service_name
    dns_name             = local.service_dns_name
    webapp_image         = local.webapp_image
    webapp_cpu           = local.webapp_cpu
    webapp_memory        = local.webapp_memory
    webapp_threads_count = local.webapp_threads_count

    worker_image         = local.worker_image
    worker_cpu           = local.worker_cpu
    worker_memory        = local.worker_memory
    worker_threads_count = local.webapp_threads_count

    scheduler_image         = local.scheduler_image
    scheduler_cpu           = local.scheduler_cpu
    scheduler_memory        = local.scheduler_memory
    scheduler_threads_count = local.scheduler_threads_count

    nginx_image  = local.nginx_image
    nginx_port   = local.nginx_port
    nginx_cpu    = local.nginx_cpu
    nginx_memory = local.nginx_memory

    email_user        = local.email_user
    email_sender_addr = local.email_sender_addr

    redis_url = local.redis_url

    # secrets
    email_password_arn       = local.email_password_arn
    database_url_arn         = local.database_url_arn
    webapp_cookie_secret_arn = local.webapp_cookie_secret_arn
  }
}

resource "aws_ecs_task_definition" "this" {
  family                = var.service_name
  container_definitions = data.template_file.this.rendered
  execution_role_arn    = aws_iam_role.execution.arn
}

resource "aws_lb_target_group" "this" {
  name                 = var.service_name
  port                 = local.nginx_port
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  deregistration_delay = local.deregistration_delay

  health_check {
    path                = local.health_check_path
    healthy_threshold   = local.health_check_unhealthy_threshold
    unhealthy_threshold = local.health_check_unhealthy_threshold
    timeout             = local.health_check_timeout
    interval            = local.health_check_interval
    matcher             = local.health_check_matcher
  }
}

resource "aws_lb_listener_rule" "http" {
  count        = local.http_listener_arn != "" ? 1 : 0
  listener_arn = local.http_listener_arn

  action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  condition {
    host_header {
      values = [local.service_dns_name]
    }
  }
}

resource "aws_lb_listener_rule" "https" {
  count        = local.https_listener_arn != "" ? 1 : 0
  listener_arn = local.https_listener_arn

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }

  condition {
    host_header {
      values = [local.service_dns_name]
    }
  }
}

resource "aws_ecs_service" "this" {
  name                               = var.service_name
  cluster                            = data.aws_ecs_cluster.this.arn
  task_definition                    = aws_ecs_task_definition.this.arn
  desired_count                      = var.service_desired_count
  deployment_maximum_percent         = var.deployment_maximum_percent
  deployment_minimum_healthy_percent = var.deployment_minimum_healthy_percent

  ordered_placement_strategy {
    type  = "spread"
    field = "attribute:ecs.availability-zone"
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  dynamic "capacity_provider_strategy" {
    for_each = var.capacity_provider_strategy
    content {
      base              = lookup(capacity_provider_strategy.value, "base", 0)
      capacity_provider = capacity_provider_strategy.value.capacity_provider
      weight            = lookup(capacity_provider_strategy.value, "weight", 100)
    }
  }

  dynamic "deployment_controller" {
    for_each = var.deployment_controller
    content {
      type = deployment_controller.value.type
    }
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name   = "nginx"
    container_port   = local.nginx_port
  }

  depends_on = [aws_lb_target_group.this]
}
