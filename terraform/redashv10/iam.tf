data "aws_iam_policy_document" "secrets" {
  statement {
    sid       = "3"
    actions   = ["kms:Decrypt"]
    resources = [data.aws_kms_alias.service.target_key_arn]
  }

  statement {
    sid    = "4"
    effect = "Allow"

    actions = ["ssm:GetParameters"]

    resources = [for secret in aws_ssm_parameter.secrets : secret.arn]
  }
}

resource "aws_iam_policy" "secrets" {
  name   = "ecs-task_${var.name}-secrets"
  path   = "/services/${terraform.workspace}/"
  policy = data.aws_iam_policy_document.secrets.json
}

resource "aws_iam_role_policy_attachment" "secrets" {
  role       = aws_iam_role.execution.name
  policy_arn = aws_iam_policy.secrets.arn
}

resource "aws_iam_role_policy_attachment" "vars" {
  for_each   = var.ecs_execution_role_policy_arns
  role       = aws_iam_role.execution.name
  policy_arn = each.key
}


data "aws_iam_policy_document" "execution_assume-role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "ecs-task_${var.name}-execution"
  path               = "/services/${terraform.workspace}/"
  assume_role_policy = data.aws_iam_policy_document.execution_assume-role.json
}
