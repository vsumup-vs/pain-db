# GitHub Secrets Configuration

To enable automated deployment, you need to configure the following secrets in your GitHub repository:

## Repository Settings > Secrets and Variables > Actions

### Required Secrets

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `PROD_HOST` | Production server IP | `65.108.100.57` |
| `PROD_USER` | SSH user for deployment | `deploy` |
| `PROD_SSH_KEY` | Private SSH key for deployment | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `STAGING_HOST` | Staging server IP (optional) | `staging.example.com` |
| `STAGING_USER` | SSH user for staging | `deploy` |
| `STAGING_SSH_KEY` | Private SSH key for staging | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `GITHUB_WEBHOOK_SECRET` | Webhook secret for security | `your-secure-random-string` |
| `SLACK_WEBHOOK` | Slack webhook for notifications (optional) | `https://hooks.slack.com/...` |
| `SNYK_TOKEN` | Snyk token for security scanning (optional) | `your-snyk-token` |

### How to Add Secrets

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** > **Actions**
4. Click **New repository secret**
5. Add each secret from the table above

### SSH Key Generation

The deployment script will generate SSH keys automatically, but you can also generate them manually:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "deploy@painmanagement.vsumup-health.com"
```

Add the public key (`github_deploy.pub`) to your server's `~/.ssh/authorized_keys` file.
Add the private key (`github_deploy`) to GitHub secrets as `PROD_SSH_KEY`.

### Webhook Configuration

1. Go to your GitHub repository
2. Click **Settings** > **Webhooks**
3. Click **Add webhook**
4. Set **Payload URL**: `http://webhook.painmanagement.vsumup-health.com/webhook`
5. Set **Content type**: `application/json`
6. Set **Secret**: Use the same value as `GITHUB_WEBHOOK_SECRET`
7. Select **Just the push event**
8. Click **Add webhook**