#!/bin/bash

# TrustedNutra Hostinger VPS Setup Script
# Run this once on your fresh Hostinger VPS

set -e

echo "=========================================="
echo "  TrustedNutra Hostinger VPS Setup"
echo "=========================================="
echo ""

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Node.js
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verify installation
echo "✅ Node.js version:"
node --version
echo "✅ npm version:"
npm --version

# Install PM2
echo "📦 Installing PM2 process manager..."
npm install -g pm2

# Install Git
echo "📦 Installing Git..."
apt-get install -y git

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /home/$(whoami)/trustednutra
cd /home/$(whoami)/trustednutra

# Setup PM2 startup
echo "🚀 Configuring PM2 to start on boot..."
pm2 startup systemd -u $(whoami) --hp /home/$(whoami)

# Create logs directory
mkdir -p logs

# Install SQLite (if not present)
echo "📦 Installing SQLite..."
apt-get install -y sqlite3

# Setup firewall (optional)
echo "🔒 Configuring firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 3000
echo "y" | ufw enable || true

# Install nginx (optional - for reverse proxy)
echo "📦 Installing Nginx..."
apt-get install -y nginx

# Create nginx config
cat > /etc/nginx/sites-available/trustednutra <<'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Enable nginx site
ln -sf /etc/nginx/sites-available/trustednutra /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo "=========================================="
echo "  ✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Clone your repository:"
echo "   git clone https://github.com/yourusername/trustednutra.git ."
echo ""
echo "2. Install dependencies:"
echo "   cd webhook-server && npm install"
echo ""
echo "3. Import CSV data:"
echo "   node csv-importer.js '../Sales Record'"
echo ""
echo "4. Start the server:"
echo "   pm2 start ../ecosystem.config.js"
echo "   pm2 save"
echo ""
echo "5. Your webhook URLs:"
echo "   http://YOUR_VPS_IP/webhook/new-order"
echo "   http://YOUR_VPS_IP/webhook/refund"
echo "   ... etc"
echo ""
echo "=========================================="
