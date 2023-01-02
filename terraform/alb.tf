resource "aws_alb_target_group" "this" {
  name                 = var.name
  port                 = local.nginx_port
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  deregistration_delay = local.deregistration_delay
  target_type          = local.target_type

  health_check {
    path                = local.health_check_path
    healthy_threshold   = local.health_check_healthy_threshold
    unhealthy_threshold = local.health_check_unhealthy_threshold
    timeout             = local.health_check_timeout
    interval            = local.health_check_interval
    matcher             = local.health_check_matcher
  }
}

resource "aws_alb_listener_rule" "http" {
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
      values = [
      local.service_dns_name]
    }
  }
}

resource "aws_alb_listener_rule" "https" {
  count        = local.https_listener_arn != "" ? 1 : 0
  listener_arn = local.https_listener_arn

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.this.arn
  }

  condition {
    host_header {
      values = [
      local.service_dns_name]
    }
  }
}
