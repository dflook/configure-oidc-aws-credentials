# GitHub Action to get AWS credentials using OIDC

This GitHub action fetches temporary AWS role session credentials using OpenID Connect.
See [About security hardening with OpenID Connect](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect) for an overview.

The GitHub identity provider must be configured in you AWS account, and the role you want to assume must have the correct trust policy.

## Inputs

* `role-arn`

  The ARN of the role to get credentials for.

    - Type: string
    - Required

* `sts-region`

  The AWS region to use the STS regional endpoint in. If not set, the global STS endpoint is used.

    - Type: string
    - Optional

* `audience`

  The OIDC audience to use.

  If not set this is chosen by the GitHub OIDC identity provider and appears to be the url of the repo owner, e.g.`https://github.com/<owner>`.

  This must be present in the audiences (client-id) list for the identity provider that has been configured in your AWS account.
  It should also match a condition in the trust policy for the role you want to assume.

    - Type: string
    - Optional

* `role-session-name`

  An identifier for the role session.

    - Type: string
    - Optional
    - Default: 'GitHubActions'

* `duration-seconds`

  The duration of the session.

  The minimum is 900 seconds. It can't be set higher than the maximum session duration of the role, which can be between 1 hour and 12 hours.

    - Type: integer
    - Optional
    - Default: 3600

* `export-variables`

  If the AWS environment variables for the session should be exported

  If set to true the `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN` environment variables will be set for use by subsequent steps.

    - Type: boolean
    - Optional
    - Default: false

## Outputs

* `aws-access-key-id`
* `aws-secret-access-key`
* `aws-session-token`

  The temporary session credentials for the requested role 

* `expiration`

  The date on which the temporary session credentials expire

## Example usage

### AWS Configuration

These examples would need an IAM Identity provider configured for GitHub in AWS account `123456789000`.
It should be an OpenID Connect provider with url `https://token.actions.githubusercontent.com`.

Assuming the actions run in this repo, the GitHub provider will use `https://github.com/dflook` as the default audience.
To match this, the audience has been set to `https://github.com/dflook` in the IAM Identity provider for `https://token.actions.githubusercontent.com`

The role `MyRole` and `MySecondRole` have the trust policy:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "",
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::123456789000:oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "https://github.com/dflook"
                },
                "StringLike": {
                    "token.actions.githubusercontent.com:sub": "repo:dflook/configure-oidc-aws-credentials:*"
                }
            }
        }
    ]
}
```

### Creating and using a session

This example fetches and uses temporary credentials using OIDC and exports them as environment variables
for the next step.

```yaml
on: [push]

permissions:
  id-token: write
  contents: read

jobs:
  simple_example:
    runs-on: ubuntu-latest
    name: Export AWS variables with a temporary session
    steps:
      - name: Fetch credentials
        uses: dflook/configure-oidc-aws-credentials@v1
        with:
          role-arn: arn:aws:iam::123456789000:role/MyRole
          export-variables: true

      - name: Test credentials
        run: aws s3 ls
```

### Using multiple sessions

This example creates sessions for two different roles.
A subsequent step sets the AWS environment variables to use one of the roles.

```yaml
on: [push]

permissions:
  id-token: write
  contents: read

jobs:
  multiple_sessions:
    runs-on: ubuntu-latest
    name: Use multiple role sessions
    steps:
      - name: Fetch MyRole credentials
        uses: dflook/configure-oidc-aws-credentials@v1
        id: my-role
        with:
          role-arn: arn:aws:iam::123456789000:role/MyRole

      - name: Fetch MySecondRole credentials
        uses: dflook/configure-oidc-aws-credentials@v1
        id: my-second-role
        with:
          role-arn: arn:aws:iam::123456789000:role/MySecondRole

      - name: Test credentials
        env:
          AWS_ACCESS_KEY_ID: ${{ steps.my-role.outputs.aws-access-key-id }}
          AWS_SECRET_ACCESS_KEY: ${{ steps.my-role.outputs.aws-secret-access-key }}
          AWS_SESSION_TOKEN: ${{ steps.my-role.outputs.aws-session-token }}
        run: aws s3 ls
```
