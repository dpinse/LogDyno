# LogDyno

Estimates wheel power and torque from an engine data log, in the browser. Drop in one or more logs of a full-throttle pull in one gear, choose the vehicle and gear, and compare the runs on one chart. Logs are never uploaded; logs, vehicles and settings stay in the browser's storage.

How the calculation works and why it is built this way: [docs/DECISIONS.md](docs/DECISIONS.md). Visual system: [DESIGN.md](DESIGN.md).

## Develop

```sh
npm install
npm run dev        # local server
npm test           # maths and log-parser tests
npm run check      # type check
npm run test:e2e   # one browser smoke test (first run: npx playwright install chromium)
npm run build      # static site in dist/
```

## Deploy

Infrastructure is Terraform in [infra/](infra/): a private S3 bucket, CloudFront with AWS's managed security headers and a rate-limiting firewall, and a GitHub Actions deploy role (OIDC, no stored keys). You run Terraform; GitHub Actions only uploads the build.

1. Create the GitHub repository and push `main`.
2. Find the repository's OIDC subject, `owner@ownerId/name@repoId`. The repo id is `gh api repos/OWNER/NAME --jq .id` or the `id` field at `https://api.github.com/repos/OWNER/NAME`.
3. In `infra/`, copy `terraform.tfvars.example` to `terraform.tfvars`, set `github_repo`, then:
   ```sh
   terraform init
   terraform apply
   ```
   The AWS account is assumed to already have the GitHub OIDC provider. In an account without one, set `create_github_oidc_provider = true`.
4. In GitHub, create an environment named `production` (Settings → Environments) and restrict its deployment branches to `main`. The deploy role trusts only that environment.
5. Add these repository variables (Settings → Secrets and variables → Actions → Variables):

   | Variable | Value |
   |---|---|
   | `AWS_REGION` | `us-east-1` |
   | `S3_BUCKET` | `terraform output -raw s3_bucket` |
   | `CLOUDFRONT_DISTRIBUTION_ID` | `terraform output -raw cloudfront_distribution_id` |
   | `AWS_DEPLOY_ROLE_ARN` | `terraform output -raw deploy_role_arn` |

6. Push to `main`, or re-run the CI workflow. The site is at `terraform output -raw site_url`.

The deploy job is skipped until `S3_BUCKET` is set, so CI passes before any of this exists.

### Custom domain

1. Set `domain_name` in `terraform.tfvars`.
2. `terraform apply -target=aws_acm_certificate.site`, then add the record from `terraform output certificate_validation_record` at your DNS host.
3. `terraform apply` (it waits for the certificate), then add the record from `terraform output site_dns_record`.

### Cap the bill

By default CloudFront is pay-as-you-go: no charge per distribution, but no ceiling either if someone floods the site. The free flat-rate plan has no overage charges (1 million requests and 100 GB a month included; beyond that AWS may serve traffic from fewer locations instead of billing). The Terraform is already shaped for it: AWS's managed security headers and the web ACL the plan requires. Subscribing is one command after `terraform apply`:

```sh
aws pricing-plan-manager create-subscription --region us-east-1 \
  --plan-family CloudFront --plan-tier FREE \
  --resource-arns $(terraform output -raw flat_rate_plan_resources)
aws pricing-plan-manager list-subscriptions --region us-east-1   # status should be ACTIVE
```

Until that subscription is active the web ACL is billed at normal AWS WAF rates (about $6 a month, pro rata). An account allows three free plans, and accounts on the AWS Free Tier are not eligible. Details: [CloudFront flat-rate pricing plans](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html).

### Renaming the repository

The deploy role names the repository. After a rename, update `github_repo` and run `terraform apply`, or deploys will be refused.

Terraform state is a local file in `infra/`. Keep it; without it the stack has to be imported by hand.
