
data "aws_lb" "alb" {
  arn = var.alb_arn
}

resource "aws_route53_record" "redashv10" {
  zone_id = var.route53_zone_id
  name    = "${var.dns_record_name}.${var.aws_route53_zone}"
  type    = "A"

  alias {
    name                   = data.aws_lb.alb.dns_name
    zone_id                = data.aws_lb.alb.zone_id
    evaluate_target_health = true
  }
}
