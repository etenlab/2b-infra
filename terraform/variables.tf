variable "AWS_STATIC_BUCKET_NAME" {
  description = "Bucket for deploying static files"
}

variable "AWS_ACCESS_KEY" {
  type = string
}

variable "AWS_SECRET_ACCESS_KEY" {
  type      = string
  sensitive = true
}

variable "AWS_REGION" {
  type = string
}

variable "SUBDOMAIN" {
  type = string
}

variable "AWS_R53_ZONE" {
  type = string
}
