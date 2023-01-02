variable "name" {
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
  type = string
}

variable "database_secret_arn" {
  type = string
}

variable "database_secret_kms_arn" {
  type = string
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

variable "capacity_provider_strategies" {
  type        = list(map(any))
  description = "The list of capacity provider strategies for the service"
  default     = []
}

variable "alb_target_type" {
  type    = string
  default = "instance"
}

variable "force_new_deployment" {
  type        = bool
  default     = false
  description = "Whether to force a new deployment of the ECS service regardless of the diff'ed changes. This value will be true when capacitor provider is enabled"
}

variable "wait_for_steady_state" {
  type    = bool
  default = true
}

variable "team" {
  type    = string
  default = "devops@auto1.com"
}

variable "tags" {
  description = "Map of tags to assign to resources"
  type        = map(any)
  default     = {}
}

variable "cpu" {
  type    = number
  default = 64
}

variable "memory" {
  type    = number
  default = 64
}

variable "network_mode" {
  description = "The Network Mode to run the container at"
  type        = string
  default     = "bridge"
}

variable "requires_compatibilities" {
  type        = list(string)
  description = "A set of launch types required by the task. The valid values are EC2 and FARGATE"
  default     = null
}

variable "launch_type" {
  type        = string
  description = "The launch type for the ECS Service"
  default     = ""
}

variable "network_configuration" {
  description = "The network configuration for the service. This parameter is required for task definitions that use the awsvpc network mode to receive their own Elastic Network Interface, and it is not supported for other network modes."
  type = list(object({
    subnets          = list(any)
    security_groups  = list(any)
    assign_public_ip = bool
  }))
  default = []
}

variable "log_driver" {
  type    = string
  default = "syslog"
}

variable "log_options" {
  type    = map(any)
  default = {}
}

variable "enable_email" {
  type    = bool
  default = false
}

variable "enable_saml" {
  type    = bool
  default = false
}

variable "saml_settings" {
  type    = map(string)
  default = {}
}

variable "enable_password_login" {
  type    = bool
  default = true
}

variable "redash_db_name" {
  type = string
}

variable "session_timeout" {
  type    = string
  default = 3600
}

variable "cookie_timeout" {
  type    = string
  default = 3600
}
