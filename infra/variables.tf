variable "project" {
  description = "Name prefix and Project tag for every resource."
  type        = string
  default     = "logdyno"
}

variable "region" {
  description = "Region for the S3 bucket. CloudFront itself is global."
  type        = string
  default     = "us-east-1"
}

variable "github_repo" {
  description = "Repository as it appears in GitHub's OIDC subject: owner@ownerId/name@repoId, e.g. dpinse@17935575/VirtualDyno@<repo id> (check CloudTrail AssumeRoleWithWebIdentity if unsure). Changes if the repository is renamed."
  type        = string
}

variable "github_environment" {
  description = "GitHub Actions environment the deploy job runs in (must match `environment:` in ci.yml)."
  type        = string
  default     = "production"
}

variable "create_github_oidc_provider" {
  description = "Set true only in an AWS account that does not yet have the token.actions.githubusercontent.com OIDC provider."
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "Optional custom domain, e.g. dyno.example.com. Empty uses the *.cloudfront.net address."
  type        = string
  default     = ""
}

variable "price_class" {
  description = "CloudFront edge locations: PriceClass_100 (NA/EU, cheapest), _200, or _All."
  type        = string
  default     = "PriceClass_100"
}
