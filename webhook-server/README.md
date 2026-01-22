# TrustedNutra Webhook Server

Real-time sales tracking and analytics system for Buygoods integration.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd webhook-server
npm install
```

### 2. Import Historical Data (Your Existing CSVs)

```bash
# Import all CSV files from Sales Record folder
node csv-importer.js "../Sales Record"

# Or import a single CSV file
node csv-importer.js "../Sales Record/OrdersReportMetaTrimTillJan-17_01-21-2026_7_11943.csv"
```

You should see output like:
```
✅ Successfully imported 34 orders from OrdersReportMetaTrimTillJan-17...
✅ Successfully imported 7 orders from OrdersReportProstaPrimeTill17Jan...

╔════════════════════════════════════════════╗
║   ✅ CSV Import Complete                  ║
║                                            ║
║   Files Processed: 2                       ║
║   Total Orders Imported: 41                ║
║                                            ║
╚════════════════════════════════════════════╝
```

### 3. Start the Server

```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

You should see:
```
╔════════════════════════════════════════════════════╗
║   🚀 TrustedNutra Webhook Server Running          ║
║                                                    ║
║   Port: 3000                                       ║
║   Environment: development                         ║
║                                                    ║
║   Webhook URLs to configure in Buygoods:          ║
║   ├─ New Order:    http://YOUR_SERVER:3000/webhook/new-order    ║
║   ├─ Refund:       http://YOUR_SERVER:3000/webhook/refund       ║
║   ├─ Cancel:       http://YOUR_SERVER:3000/webhook/cancel       ║
║   ├─ Chargeback:   http://YOUR_SERVER:3000/webhook/chargeback   ║
║   ├─ Fulfilled:    http://YOUR_SERVER:3000/webhook/fulfilled    ║
║   └─ Recurring:    http://YOUR_SERVER:3000/webhook/recurring    ║
║                                                    ║
╚════════════════════════════════════════════════════╝
```

## 🌐 Deploy to Production

### Option A: Deploy to VPS (Digital Ocean, Vultr, etc.)

1. **Get a VPS** (~$5/month)
   - Digital Ocean: https://www.digitalocean.com/
   - Vultr: https://www.vultr.com/
   - Linode: https://www.linode.com/

2. **SSH into your server**
   ```bash
   ssh root@YOUR_SERVER_IP
   ```

3. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Upload your code**
   ```bash
   # On your local machine
   scp -r webhook-server root@YOUR_SERVER_IP:/var/www/
   ```

5. **Install and run**
   ```bash
   cd /var/www/webhook-server
   npm install
   npm install -g pm2
   pm2 start server.js --name trustednutra-webhook
   pm2 save
   pm2 startup
   ```

6. **Get your webhook URLs**
   ```
   http://YOUR_SERVER_IP:3000/webhook/new-order
   http://YOUR_SERVER_IP:3000/webhook/refund
   ... etc
   ```

### Option B: Use Ngrok (Testing/Development)

For testing before deploying to production:

1. **Install Ngrok**
   - Download from: https://ngrok.com/download

2. **Run your server locally**
   ```bash
   npm start
   ```

3. **In another terminal, start ngrok**
   ```bash
   ngrok http 3000
   ```

4. **Use the ngrok URL**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:3000

   Your webhook URLs:
   https://abc123.ngrok.io/webhook/new-order
   https://abc123.ngrok.io/webhook/refund
   ... etc
   ```

## 🔧 Configure Buygoods Webhooks

1. **Login to Buygoods Backoffice**
   - Go to: https://backoffice.buygoods.com/

2. **Navigate to Products > Settings**

3. **Enter your webhook URLs:**
   ```
   New order URL:          http://YOUR_SERVER:3000/webhook/new-order
   Order refund URL:       http://YOUR_SERVER:3000/webhook/refund
   Order cancel URL:       http://YOUR_SERVER:3000/webhook/cancel
   Order chargeback URL:   http://YOUR_SERVER:3000/webhook/chargeback
   Order fulfilled URL:    http://YOUR_SERVER:3000/webhook/fulfilled
   Recurring charge URL:   http://YOUR_SERVER:3000/webhook/recurring
   ```

4. **Click "Save changes"**

5. **Test it!**
   - Make a test order (or wait for a real one)
   - Check your server logs
   - You should see: `📦 New order received: ...`

## 📊 API Endpoints

Your dashboard will use these endpoints to fetch data:

### Get All Orders
```
GET /api/orders?start_date=2026-01-08&end_date=2026-01-17&product=Meta Trim BHB
```

### Get Daily Stats
```
GET /api/stats/daily?start_date=2026-01-08&end_date=2026-01-17
```

### Get Product Summary
```
GET /api/stats/products?start_date=2026-01-08&end_date=2026-01-17
```

### Get Recent Orders (Live Feed)
```
GET /api/orders/recent?limit=20
```

### Get Total Stats
```
GET /api/stats/total
```

### Health Check
```
GET /health
```

## 🗄️ Database

- **Type:** SQLite (no separate database server needed)
- **Location:** `trustednutra.db` (created automatically)
- **Backup:** Just copy the `.db` file

### Tables Created:
- `orders` - All order data
- `refunds` - Refund records
- `chargebacks` - Chargeback records
- `daily_stats` - Cached statistics

## 📝 Logs

Server logs will show:
- ✅ Successful webhook receipts
- ❌ Errors
- 📊 Order details
- 🔄 Database operations

Example:
```
[2026-01-21T10:30:45.123Z] POST /webhook/new-order
📦 New order received: { order_id: '123456', product_name: 'Meta Trim BHB', ... }
✅ Order saved to database: 123456
```

## 🔒 Security Notes

For production:
1. Use HTTPS (get SSL certificate with Let's Encrypt)
2. Add webhook signature verification
3. Set up firewall rules
4. Regular database backups
5. Use environment variables for sensitive data

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is already in use
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

### CSV import fails
```bash
# Check file path
ls -la "../Sales Record"

# Check CSV format
head -5 "../Sales Record/OrdersReportMetaTrim...csv"
```

### Webhooks not receiving
1. Check server is running: `curl http://YOUR_SERVER:3000/health`
2. Check Buygoods webhook URLs are correct
3. Check server logs for errors
4. Test manually: `curl -X POST http://YOUR_SERVER:3000/webhook/new-order -H "Content-Type: application/json" -d '{"order_id":"test123","product_name":"Test Product","total":100}'`

## 📦 Project Structure

```
webhook-server/
├── server.js           # Main Express server
├── database.js         # Database functions
├── csv-importer.js     # Import historical CSV data
├── package.json        # Dependencies
├── .env                # Configuration
├── .env.example        # Example config
├── trustednutra.db     # SQLite database (created automatically)
└── README.md           # This file
```

## 🎯 Next Steps

1. ✅ Import your existing CSV data
2. ✅ Start the server
3. ✅ Deploy to production server
4. ✅ Configure Buygoods webhooks
5. ⏳ Wait for new orders to come in
6. ✅ Open Analytics tab in project_launch.html

## 💡 Tips

- **Backup regularly:** Copy `trustednutra.db` to safe location
- **Monitor logs:** Use `pm2 logs` in production
- **Test webhooks:** Use Buygoods test mode or manual curl commands
- **Performance:** SQLite handles 100k+ orders easily

## 🆘 Need Help?

Check logs:
```bash
# Development
Just watch the console

# Production with PM2
pm2 logs trustednutra-webhook
```

Database issues:
```bash
# Open database
sqlite3 trustednutra.db

# Check tables
.tables

# Count orders
SELECT COUNT(*) FROM orders;

# Exit
.quit
```

---

**Ready?** Start with step 1: Import your CSVs! 🚀
