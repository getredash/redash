resource "aws_ssm_parameter" "secrets" {
  for_each = var.ecs_task_secrets
  name     = "/services/${terraform.workspace}/${var.name}/${each.key}"
  type     = "SecureString"
  value    = each.value
  key_id   = data.aws_kms_alias.service.target_key_arn
}

data "aws_kms_alias" "service" {
  name = "alias/dev/apps"
}
