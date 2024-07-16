variable "ENV" {
  type        = string
  description = "production or development used for prefix"
}

variable "AWS_VPC_ID" {
  type        = string
  description = "AWS VPC ID to build Infrastructure in"
}

variable "ECS_CLUSTER_NAME" {
  type        = string
  description = "ECS Cluster"
}

variable "AWS_TARGET_GROUP_ARN" {
  type        = string
  description = "The target group ARN."
}

variable "TASK_CPU" {
  type        = number
  description = "Number of CPU's for each Task Definition"
}

variable "TASK_MEMORY" {
  type        = number
  description = "Number of CPU's for each Task Definition"
}

variable "WORKERS_TASK_CPU" {
  type        = number
  description = "Number of CPU's for each Workers Task Definition"
}

variable "WORKERS_TASK_MEMORY" {
  type        = number
  description = "Number of CPU's for each Workers Task Definition"
}

variable "SCHEDULER_TASK_CPU" {
  type        = number
  description = "Number of CPU's for each Scheduler Task Definition"
}

variable "SCHEDULER_TASK_MEMORY" {
  type        = number
  description = "Number of CPU's for each Scheduler Task Definition"
}

variable "AWS_TASK_ROLE" {
  type        = string
  description = "The role used by AWS Fargate Task"
}

variable "AWS_EXECUTION_ROLE" {
  type        = string
  description = "The role used by AWS Fargate for Execution."
}

variable "AWS_SUBNETS" {
  type        = list(string)
  description = "AWS Subnets to attach to the service."
}

variable "AWS_SECURITY_GROUPS" {
  type        = list(string)
  description = "AWS Security groups to attach to the service."
}
