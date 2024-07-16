###########################
###### REDASH SERVER ######
###########################

resource "aws_ecs_service" "server" {
  name                               = "server"
  cluster                            = data.aws_ecs_cluster.this.arn
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  desired_count                      = "1"
  enable_execute_command             = true
  health_check_grace_period_seconds  = 120
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  scheduling_strategy                = "REPLICA"
  task_definition                    = aws_ecs_task_definition.server.arn

  deployment_controller {
    type = "ECS"
  }

  load_balancer {
    container_name   = "nginx"
    container_port   = 80
    target_group_arn = data.aws_alb_target_group.this.arn
  }

  network_configuration {
    assign_public_ip = false
    security_groups  = var.AWS_SECURITY_GROUPS
    subnets          = var.AWS_SUBNETS
  }

  timeouts {}
}

resource "aws_ecs_task_definition" "server" {
  family                = "Redash${var.ENV}V2Server"
  container_definitions = file("./env/containerDefinitions/${var.ENV}/serverContainerDef.json")
  cpu                   = var.TASK_CPU
  execution_role_arn    = data.aws_iam_role.execution.arn
  task_role_arn         = data.aws_iam_role.task.arn
  memory                = var.TASK_MEMORY
  network_mode          = "awsvpc"
  requires_compatibilities = [
    "FARGATE",
  ]
  skip_destroy = true
}

##############################
###### Redash Scheduler ######
##############################

resource "aws_ecs_service" "scheduler" {
  name                               = "scheduler"
  cluster                            = data.aws_ecs_cluster.this.arn
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  desired_count                      = "1"
  enable_execute_command             = true
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  scheduling_strategy                = "REPLICA"
  task_definition                    = aws_ecs_task_definition.scheduler.arn

  deployment_controller {
    type = "ECS"
  }

  network_configuration {
    assign_public_ip = false
    security_groups  = var.AWS_SECURITY_GROUPS
    subnets          = var.AWS_SUBNETS
  }

  timeouts {}
}

resource "aws_ecs_task_definition" "scheduler" {
  family                = "Redash${var.ENV}V2Scheduler"
  container_definitions = file("./env/containerDefinitions/${var.ENV}/schedulerContainerDef.json")
  cpu                   = var.SCHEDULER_TASK_CPU
  execution_role_arn    = data.aws_iam_role.execution.arn
  task_role_arn         = data.aws_iam_role.task.arn
  memory                = var.SCHEDULER_TASK_MEMORY
  network_mode          = "awsvpc"
  requires_compatibilities = [
    "FARGATE",
  ]
  skip_destroy = true
}

####################################
###### Redash Default Workers ######
####################################

resource "aws_ecs_service" "defaultWorkers" {
  name                               = "default_workers"
  cluster                            = data.aws_ecs_cluster.this.arn
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  desired_count                      = "1"
  enable_execute_command             = true
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  scheduling_strategy                = "REPLICA"
  task_definition                    = aws_ecs_task_definition.defaultWorkers.arn

  deployment_controller {
    type = "ECS"
  }

  network_configuration {
    assign_public_ip = false
    security_groups  = var.AWS_SECURITY_GROUPS
    subnets          = var.AWS_SUBNETS
  }

  timeouts {}
}

resource "aws_ecs_task_definition" "defaultWorkers" {
  family                = "Redash${var.ENV}V2DefaultWorkers"
  container_definitions = file("./env/containerDefinitions/${var.ENV}/defaultWorkersContainerDef.json")
  cpu                   = var.WORKERS_TASK_CPU
  execution_role_arn    = data.aws_iam_role.execution.arn
  task_role_arn         = data.aws_iam_role.task.arn
  memory                = var.WORKERS_TASK_MEMORY
  network_mode          = "awsvpc"
  requires_compatibilities = [
    "FARGATE",
  ]
  skip_destroy = true
}

##################################
###### Redash AdHoc Workers ######
##################################

resource "aws_ecs_service" "adhocWorkers" {
  name                               = "adhoc_workers"
  cluster                            = data.aws_ecs_cluster.this.arn
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  desired_count                      = "1"
  enable_execute_command             = true
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  scheduling_strategy                = "REPLICA"
  task_definition                    = aws_ecs_task_definition.adhocWorkers.arn

  deployment_controller {
    type = "ECS"
  }

  network_configuration {
    assign_public_ip = false
    security_groups  = var.AWS_SECURITY_GROUPS
    subnets          = var.AWS_SUBNETS
  }

  timeouts {}
}

resource "aws_ecs_task_definition" "adhocWorkers" {
  family                = "Redash${var.ENV}V2AdHocWorkers"
  container_definitions = file("./env/containerDefinitions/${var.ENV}/adhocWorkersContainerDef.json")
  cpu                   = var.WORKERS_TASK_CPU
  execution_role_arn    = data.aws_iam_role.execution.arn
  task_role_arn         = data.aws_iam_role.task.arn
  memory                = var.WORKERS_TASK_MEMORY
  network_mode          = "awsvpc"
  requires_compatibilities = [
    "FARGATE",
  ]
  skip_destroy = true
}

######################################
###### Redash Scheduled Workers ######
######################################

resource "aws_ecs_service" "scheduledWorkers" {
  name                               = "scheduled_workers"
  cluster                            = data.aws_ecs_cluster.this.arn
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  desired_count                      = "1"
  enable_execute_command             = true
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  scheduling_strategy                = "REPLICA"
  task_definition                    = aws_ecs_task_definition.scheduledWorkers.arn

  deployment_controller {
    type = "ECS"
  }

  network_configuration {
    assign_public_ip = false
    security_groups  = var.AWS_SECURITY_GROUPS
    subnets          = var.AWS_SUBNETS
  }

  timeouts {}
}

resource "aws_ecs_task_definition" "scheduledWorkers" {
  family                = "Redash${var.ENV}V2ScheduledWorkers"
  container_definitions = file("./env/containerDefinitions/${var.ENV}/scheduledWorkersContainerDef.json")
  cpu                   = var.WORKERS_TASK_CPU
  execution_role_arn    = data.aws_iam_role.execution.arn
  task_role_arn         = data.aws_iam_role.task.arn
  memory                = var.WORKERS_TASK_MEMORY
  network_mode          = "awsvpc"
  requires_compatibilities = [
    "FARGATE",
  ]
  skip_destroy = true
}
