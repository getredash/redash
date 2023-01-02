locals {
  service_dns_name        = "${var.dns_record_name}.${var.dns_zone_name}"
  webapp_image            = lookup(var.ecs_task_settings, "webapp_image")
  webapp_cpu              = lookup(var.ecs_task_settings, "webapp_cpu", 32)
  webapp_memory           = lookup(var.ecs_task_settings, "webapp_memory", 128)
  webapp_threads_count    = lookup(var.ecs_task_settings, "webapp_threads_count", 4)
  worker_image            = lookup(var.ecs_task_settings, "worker_image")
  worker_cpu              = lookup(var.ecs_task_settings, "worker_cpu", 32)
  worker_memory           = lookup(var.ecs_task_settings, "worker_memory", 128)
  worker_threads_count    = lookup(var.ecs_task_settings, "worker_threads_count", 4)
  scheduler_image         = lookup(var.ecs_task_settings, "scheduler_image")
  scheduler_cpu           = lookup(var.ecs_task_settings, "scheduler_cpu", 32)
  scheduler_memory        = lookup(var.ecs_task_settings, "scheduler_memory", 128)
  redis_image             = lookup(var.ecs_task_settings, "redis_image", "redis:5-alpine")
  redis_cpu               = lookup(var.ecs_task_settings, "redis_cpu", 32)
  redis_memory            = lookup(var.ecs_task_settings, "redis_memory", 128)
  scheduler_threads_count = lookup(var.ecs_task_settings, "scheduler_threads_count", 4)
  nginx_image             = lookup(var.ecs_task_settings, "nginx_image")
  nginx_cpu               = lookup(var.ecs_task_settings, "nginx_cpu", 16)
  nginx_memory            = lookup(var.ecs_task_settings, "nginx_memory", 64)
  nginx_port              = lookup(var.ecs_task_settings, "nginx_port", 80)
  email_user              = lookup(var.ecs_task_settings, "email_user", "-")
  email_sender_addr       = lookup(var.ecs_task_settings, "email_sender_addr", "email@d.omain")

  webapp_cookie_secret_arn = aws_ssm_parameter.secrets["webapp_cookie_secret"].arn

  deregistration_delay             = lookup(var.lb_settings, "deregistration_delay", 30)
  health_check_path                = lookup(var.lb_settings, "health_check_path", "/")
  health_check_healthy_threshold   = lookup(var.lb_settings, "health_check_healthy_threshold", 2)
  health_check_unhealthy_threshold = lookup(var.lb_settings, "health_check_unhealthy_threshold", 6)
  health_check_timeout             = lookup(var.lb_settings, "health_check_timeout", 10)
  health_check_interval            = lookup(var.lb_settings, "health_check_interval", 40)
  health_check_matcher             = lookup(var.lb_settings, "health_check_matcher", "200")
  http_listener_arn                = lookup(var.lb_settings, "http_listener_arn", "")
  https_listener_arn               = lookup(var.lb_settings, "https_listener_arn", "")

  _redis_url = local.launch_type == "FARGATE" ? "redis://localhost:6379/0" : "redis://redis:6379/0"
  redis_url  = lookup(var.ecs_task_settings, "redis_url", "") == "" ? local._redis_url : lookup(var.ecs_task_settings, "redis_url", "")

  log_options_awslogs = {
    "awslogs-create-group"  = "true"
    "awslogs-group"         = "ecs/${lower(local.launch_type)}/${var.name}"
    "awslogs-region"        = data.aws_region.current.name
    "awslogs-stream-prefix" = "${var.name}-$${container_name}$"
  }

  log_options_jsonfile = {
    "tag"      = "docker/${var.name}-$${container_name}$",
    "labels"   = "${var.name}-$${container_name}$",
    "max-size" = "200m",
    "max-file" = "14"
  }

  log_options_syslog = {
    "tag"    = "docker/${var.name}-$${container_name}$",
    "labels" = "${var.name}-$${container_name}$"
  }

  log_options_map = {
    syslog    = local.log_options_syslog
    awslogs   = local.log_options_awslogs
    json-file = local.log_options_jsonfile
  }

  launch_type = upper(var.launch_type)
  log_driver  = local.launch_type == "FARGATE" ? "awslogs" : var.log_driver
  log_options = lookup(local.log_options_map, local.log_driver, var.log_options)
  requires_compatibilities = local.launch_type == "FARGATE" ? [
  "FARGATE"] : var.requires_compatibilities
  network_mode = local.launch_type == "FARGATE" ? "awsvpc" : var.network_mode
  task_cpu     = local.launch_type == "FARGATE" ? var.cpu : null
  task_memory  = local.launch_type == "FARGATE" ? var.memory : null
  target_type  = local.launch_type == "FARGATE" ? "ip" : var.alb_target_type

  tags_defaults = {
    "service" = var.name
    "env"     = terraform.workspace
    "team"    = var.team
  }
  tags = merge(local.tags_defaults, var.tags)

  ordered_placement_strategies = local.launch_type == "FARGATE" ? [] : [
    {
      type  = "spread"
      field = "attribute:ecs.availability-zone"
    },
    {
      type  = "spread"
      field = "instanceId"
    }
  ]

  capacity_provider_strategies = var.launch_type == "" ? coalescelist(var.capacity_provider_strategies, [
    {
      capacity_provider = var.ecs_cluster_name
  }]) : []

  is_capacity_provider_enabled = length(local.capacity_provider_strategies) == 0 ? false : true

  _email_vars = [
    {
      name  = "REDASH_MAIL_SERVER",
      value = "email-smtp.eu-west-1.amazonaws.com"
    },
    {
      name  = "REDASH_MAIL_PORT",
      value = "587"
    },
    {
      name  = "REDASH_MAIL_USE_TLS",
      value = "True"
    },
    {
      name  = "REDASH_MAIL_USE_SSL",
      value = "False"
    },
    {
      name  = "REDASH_MAIL_USERNAME",
      value = local.email_user
    },
    {
      name  = "REDASH_MAIL_DEFAULT_SENDER",
      value = local.email_sender_addr
    },
  ]

  common_env_vars = [
    {
      name  = "REDASH_THROTTLE_PASS_RESET_PATTERN",
      value = "1/hour"
    },
    {
      name  = "REDASH_QUERY_REFRESH_INTERVALS",
      value = "28800, 32400, 36000, 39600, 43200, 86400, 604800, 1209600, 2592000"
    },
    {
      name  = "REDASH_DISABLE_PUBLIC_URLS",
      value = "True"
    },
    {
      name  = "REDASH_FEATURE_AUTO_PUBLISH_NAMED_QUERIES",
      value = "False"
    },
    {
      name  = "REDASH_FEATURE_DISABLE_REFRESH_QUERIES",
      value = "True"
    },
    {
      name  = "REDASH_VERSION_CHECK",
      value = "False"
    },
    {
      name  = "REDASH_ADHOC_QUERY_TIME_LIMIT",
      value = "900"
    },
    {
      name  = "REDASH_SCHEMAS_REFRESH_SCHEDULE",
      value = "15"
    },
    {
      name  = "REDASH_REMEMBER_COOKIE_DURATION",
      value = var.cookie_timeout
    },
    {
      name  = "REDASH_SESSION_EXPIRY_TIME",
      value = var.session_timeout
    },
    {
      name  = "REDASH_LOG_LEVEL",
      value = "INFO"
    },
    {
      name  = "REDASH_REDIS_URL",
      value = local.redis_url
    },
    {
      name  = "REDASH_HOST",
      value = local.service_dns_name
    },
    {
      name  = "REDASH_THROTTLE_LOGIN_PATTERN",
      value = "50/second"
    },
    {
      name  = "PYTHONUNBUFFERED",
      value = "0"
    },
    {
      name  = "REDASH_PASSWORD_LOGIN_ENABLED",
      value = var.enable_password_login ? "True" : "False"
    },
    {
      name  = "DB_NAME",
      value = var.redash_db_name
    }
  ]

  worker_extra_vars = [
    {
      name  = "WORKERS_COUNT",
      value = local.worker_threads_count
    }
  ]

  scheduler_extra_vars = [
    {
      name  = "WORKERS_COUNT",
      value = local.scheduler_threads_count
    }
  ]

  webapp_extra_vars = [
    {
      name  = "REDASH_WEB_WORKERS",
      value = local.webapp_threads_count
    },
    {
      name  = "MAX_REQUESTS",
      value = "10000"
    },
    {
      name  = "MAX_REQUESTS_JITTER",
      value = "500"
    }
  ]

  nginx_vars = [
    {
      name  = "UPSTREAM_HOST",
      value = local.launch_type == "FARGATE" ? "localhost" : "webapp"
    },
  ]

  _saml_vars = [
    {
      name  = "REDASH_SAML_METADATA_URL",
      value = "https://id.auto1.team/app/${lookup(var.saml_settings, "entity_id", "")}/sso/saml/metadata"
    },
    {
      name  = "REDASH_SAML_ENTITY_ID",
      value = "https://id.auto1.team/app/${lookup(var.saml_settings, "name", "")}/${lookup(var.saml_settings, "entity_id", "")}/sso/saml"
    },
    {
      name  = "REDASH_SAML_NAMEID_FORMAT",
      value = lookup(var.saml_settings, "nameid_format", "")
    },
    {
      name  = "REDASH_SAML_SSO_URL"
      value = lookup(var.saml_settings, "sso_url", "")
    },
    {
      name  = "REDASH_SAML_AUTH_TYPE"
      value = "dynamic"
    }
  ]

  email_vars                      = var.enable_email ? local._email_vars : []
  saml_vars                       = var.enable_saml ? local._saml_vars : []
  environment_variables_webapp    = concat(local.common_env_vars, local.worker_extra_vars, local.email_vars, local.saml_vars)
  environment_variables_worker    = concat(local.common_env_vars, local.worker_extra_vars, local.email_vars, local.saml_vars)
  environment_variables_scheduler = concat(local.common_env_vars, local.scheduler_extra_vars, local.email_vars, local.saml_vars)

  _secrets = [
    {
      name      = "REDASH_COOKIE_SECRET",
      valueFrom = aws_ssm_parameter.secrets["webapp_cookie_secret"].arn
    },
    {
      name      = "DB_USER",
      valueFrom = "${var.database_secret_arn}:username::"
    },
    {
      name      = "DB_PASS",
      valueFrom = "${var.database_secret_arn}:password::"
    },
    {
      name      = "DB_HOST",
      valueFrom = "${var.database_secret_arn}:host::"
    },
    {
      name      = "DB_PORT",
      valueFrom = "${var.database_secret_arn}:port::"
    }
  ]

  secrets = var.enable_email ? concat(local._secrets,
    {
      name      = "REDASH_MAIL_PASSWORD",
      valueFrom = aws_ssm_parameter.secrets["email_password_arn"].arn
    }
  ) : local._secrets
}
