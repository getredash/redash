data "aws_vpc" "this" {
  id = var.AWS_VPC_ID
}

data "aws_ecs_cluster" "this" {
  cluster_name = var.ECS_CLUSTER_NAME
}

data "aws_alb_target_group" "this" {
  arn = var.AWS_TARGET_GROUP_ARN
}

data "aws_iam_role" "task" {
  name = var.AWS_TASK_ROLE
}

data "aws_iam_role" "execution" {
  name = var.AWS_EXECUTION_ROLE
}
