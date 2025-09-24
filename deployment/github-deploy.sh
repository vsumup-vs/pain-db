#!/bin/bash

# GitHub-integrated deployment script for Pain Management Database
# This script sets up automated deployment from GitHub

set -e

# Configuration
APP_NAME="pain-db"
APP_DIR="/var/www/pain-db"
DOMAIN="painmanagement.vsumup-health.com"
GITHUB_REPO="vsumup-vs/pain-db"  # Updated with your GitHub repository

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root"
fi

log "🚀 Setting up GitHub-integrated deployment for Pain Management Database..."

# 1. Install Git if not present
if ! command -v git &> /dev/null; then
    log "📦 Installing Git..."
    apt update
    apt install -y git
fi

# 2. Create deployment user
log "👤 Setting up deployment user..."
if ! id "deploy" &>/dev/null; then
    useradd -m -s /bin/bash deploy
    usermod -aG sudo deploy
fi

# 3. Setup SSH keys for GitHub
log "🔑 Setting up SSH keys for GitHub deployment..."
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo -u deploy ssh-keygen -t ed25519 -f /home/deploy/.ssh/github_deploy -N "" -C "deploy@painmanagement.vsumup-health.com"

# 4. Clone repository
log "📂 Cloning repository from GitHub..."
if [ ! -d "$APP_DIR" ]; then
    git clone https://github.com/$GITHUB_REPO.git $APP_DIR
else
    cd $APP_DIR
    git pull origin main
fi

# 5. Set up deployment webhook endpoint
log "🔗 Setting up GitHub webhook endpoint..."
cat > /var/www/webhook-handler.js << 'EOF'
const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const app = express();

app.use(express.json());

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const DEPLOY_SCRIPT = '/var/www/pain-db/deployment/auto-deploy.sh';

function verifySignature(payload, signature) {
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

app.post('/webhook', (req, res) => {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);

    if (!verifySignature(payload, signature)) {
        return res.status(401).send('Unauthorized');
    }

    if (req.body.ref === 'refs/heads/main') {
        console.log('Deploying to production...');
        exec(`sudo ${DEPLOY_SCRIPT}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Deployment error: ${error}`);
                return res.status(500).send('Deployment failed');
            }
            console.log(`Deployment output: ${stdout}`);
            res.status(200).send('Deployment successful');
        });
    } else {
        res.status(200).send('Not main branch, skipping deployment');
    }
});

app.listen(3002, () => {
    console.log('Webhook handler listening on port 3002');
});
EOF

# 6. Create auto-deployment script
log "🤖 Creating auto-deployment script..."
cat > $APP_DIR/deployment/auto-deploy.sh << 'EOF'
#!/bin/bash
set -e

APP_DIR="/var/www/pain-db"
LOG_FILE="/var/log/pain-db/deploy.log"

echo "$(date): Starting auto-deployment..." >> $LOG_FILE

cd $APP_DIR
git pull origin main >> $LOG_FILE 2>&1
npm ci --only=production >> $LOG_FILE 2>&1
npx prisma generate >> $LOG_FILE 2>&1
npx prisma migrate deploy >> $LOG_FILE 2>&1
systemctl restart pain-db >> $LOG_FILE 2>&1
systemctl reload nginx >> $LOG_FILE 2>&1

echo "$(date): Auto-deployment completed successfully!" >> $LOG_FILE
EOF

chmod +x $APP_DIR/deployment/auto-deploy.sh

# 7. Create systemd service for webhook handler
log "⚙️ Setting up webhook handler service..."
cat > /etc/systemd/system/github-webhook.service << EOF
[Unit]
Description=GitHub Webhook Handler for Pain DB
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www
Environment=NODE_ENV=production
Environment=GITHUB_WEBHOOK_SECRET=CHANGE_THIS_SECRET
ExecStart=/usr/bin/node webhook-handler.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable github-webhook

# 8. Configure NGINX for webhook endpoint
log "🌐 Configuring NGINX for webhook..."
cat > /etc/nginx/sites-available/webhook << EOF
server {
    listen 80;
    server_name webhook.painmanagement.vsumup-health.com;

    location /webhook {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/webhook /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

log "✅ GitHub integration setup completed!"
log ""
log "📋 Next Steps:"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "1. Add the following public key to your GitHub repository deploy keys:"
log "   $(cat /home/deploy/.ssh/github_deploy.pub)"
log ""
log "2. Set up GitHub webhook:"
log "   - URL: http://webhook.painmanagement.vsumup-health.com/webhook"
log "   - Content type: application/json"
log "   - Secret: Generate a secure secret and update /etc/systemd/system/github-webhook.service"
log "   - Events: Just the push event"
log ""
log "3. Update GitHub repository secrets with:"
log "   - PROD_HOST: 65.108.100.57"
log "   - PROD_USER: deploy"
log "   - PROD_SSH_KEY: (contents of /home/deploy/.ssh/github_deploy)"
log ""
log "4. Start the webhook service:"
log "   systemctl start github-webhook"
EOF

chmod +x /home/vsumup/pain-db/deployment/github-deploy.sh