# 🚀 Webhook Setup Guide - Quick Start

## ✅ What's Been Created

### 1. **Webhook Server** (`webhook-server/` folder)
- Full Node.js/Express server ready to receive Buygoods webhooks
- SQLite database for storing all order data
- API endpoints for the dashboard to fetch data
- CSV import tool for your historical data

### 2. **Analytics Dashboard** (New tab in `project_launch.html`)
- Real-time sales tracking with auto-refresh
- Date range filtering (today, week, month, custom)
- Product performance cards with package distribution
- Recent orders live feed
- Connection test tool

### 3. **Features**
✅ Real-time order tracking via webhooks
✅ Historical data import from CSV files
✅ Date/week range filtering
✅ Product comparison analytics
✅ Package distribution analysis
✅ Live order feed
✅ Auto-refresh every 30 seconds

---

## 🎯 Quick Start (3 Steps)

### Step 1: Install & Import Your Data (5 minutes)

```bash
# Navigate to webhook server folder
cd webhook-server

# Install dependencies
npm install

# Import your existing CSV files
node csv-importer.js "../Sales Record"
```

You should see:
```
✅ Successfully imported 34 orders from OrdersReportMetaTrim...
✅ Successfully imported 7 orders from OrdersReportProstaPrime...
╔════════════════════════════════════════════╗
║   ✅ CSV Import Complete                  ║
║   Files Processed: 2                       ║
║   Total Orders Imported: 41                ║
╚════════════════════════════════════════════╝
```

### Step 2: Start the Server (1 minute)

```bash
# Start the webhook server
npm start
```

You should see:
```
╔════════════════════════════════════════════════════╗
║   🚀 TrustedNutra Webhook Server Running          ║
║   Port: 3000                                       ║
║   ...                                              ║
╚════════════════════════════════════════════════════╝
```

**Keep this terminal window open!**

### Step 3: View Your Dashboard (30 seconds)

1. Open `project_launch.html` in your browser
2. Click on the **📊 Analytics** tab
3. Click **🔌 Test Connection** button
4. You should see "✅ Connected"
5. Your sales data will load automatically!

---

## 🌐 Deploy to Production (When Ready)

### Option A: Using Ngrok (Testing - Free)

Perfect for testing webhooks before deploying:

```bash
# In a new terminal
ngrok http 3000
```

You'll get a URL like: `https://abc123.ngrok.io`

### Option B: VPS Deployment (Production - $5/month)

1. Get a VPS from Digital Ocean, Vultr, or Linode
2. Upload webhook-server folder
3. Install Node.js and PM2
4. Run: `pm2 start server.js --name trustednutra`

**Full deployment instructions in:** `webhook-server/README.md`

---

## 🔧 Configure Buygoods Webhooks

Once your server is deployed:

1. Login to [Buygoods Backoffice](https://backoffice.buygoods.com/)
2. Go to **Products > Settings**
3. Enter your webhook URLs:

```
New order URL:          http://YOUR_SERVER:3000/webhook/new-order
Order refund URL:       http://YOUR_SERVER:3000/webhook/refund
Order cancel URL:       http://YOUR_SERVER:3000/webhook/cancel
Order chargeback URL:   http://YOUR_SERVER:3000/webhook/chargeback
Order fulfilled URL:    http://YOUR_SERVER:3000/webhook/fulfilled
Recurring charge URL:   http://YOUR_SERVER:3000/webhook/recurring
```

4. Click **Save changes**

**Replace `YOUR_SERVER` with:**
- Your VPS IP address (e.g., `http://123.45.67.89:3000`)
- Your ngrok URL (e.g., `https://abc123.ngrok.io`)
- Your domain (e.g., `https://webhooks.yoursite.com`)

---

## 📊 Using the Analytics Dashboard

### Date Filtering
- **Today**: See today's orders only
- **This Week**: Last 7 days
- **This Month**: Last 30 days
- **All Time**: All data from day 1
- **Custom**: Pick any start/end date

### What You'll See
- **Total Orders**: Number of sales
- **Total Revenue**: Money earned
- **Total Units**: Bottles/units delivered
- **Avg Daily Sales**: Sales per day
- **Package Distribution**: 2/3/6 bottle breakdown with percentages
- **Most Popular**: Best-selling package
- **Recent Orders**: Live feed of latest orders

### Auto-Refresh
- Dashboard refreshes every 30 seconds automatically
- Shows "Last updated" timestamp
- Green "🔴 LIVE" indicator shows connection status

---

## 🔍 Troubleshooting

### Dashboard shows "Cannot connect to webhook server"
**Solution:**
```bash
cd webhook-server
npm start
```
Make sure the server is running!

### CSV import fails
**Solution:**
```bash
# Check if files exist
ls -la "../Sales Record"

# Try importing one file at a time
node csv-importer.js "../Sales Record/OrdersReportMetaTrim...csv"
```

### Webhooks not receiving from Buygoods
**Checklist:**
1. ✅ Server is running (`npm start`)
2. ✅ Server is publicly accessible (not localhost if using Buygoods)
3. ✅ Webhook URLs are correct in Buygoods settings
4. ✅ Click "Save changes" in Buygoods after entering URLs

**Test webhook manually:**
```bash
curl -X POST http://localhost:3000/webhook/new-order \
  -H "Content-Type: application/json" \
  -d '{"order_id":"test123","product_name":"Meta Trim BHB","total":157.99}'
```

### Port 3000 already in use
**Solution:**
```bash
# Use a different port
PORT=3001 npm start
```

Then update API URL in Analytics tab to `http://localhost:3001`

---

## 📁 Project Structure

```
TrustedNutraProducts/
├── project_launch.html          # Main dashboard (Analytics tab added)
├── Sales Record/                # Your CSV files folder
├── webhook-server/              # NEW: Webhook system
│   ├── server.js                # Main webhook server
│   ├── database.js              # Database functions
│   ├── csv-importer.js          # Import historical CSVs
│   ├── package.json             # Dependencies
│   ├── .env                     # Configuration
│   ├── trustednutra.db          # SQLite database (created automatically)
│   └── README.md                # Detailed documentation
├── WEBHOOK_SETUP_GUIDE.md       # This file
└── ...
```

---

## 🎉 Next Steps

1. ✅ **Import your CSVs** - Done in Step 1
2. ✅ **Start the server** - Done in Step 2
3. ✅ **View dashboard** - Done in Step 3
4. ⏳ **Deploy to production** - When you're ready to go live
5. ⏳ **Configure Buygoods webhooks** - Start receiving real-time orders
6. ⏳ **Add more CSV data** - As you download more sales reports

---

## 💡 Tips

- **Backup your database**: Just copy `trustednutra.db` file
- **Check logs**: Watch the terminal where `npm start` is running
- **Monitor performance**: Use `pm2 monit` in production
- **Multiple products**: System automatically handles all products
- **Date ranges**: Try different date ranges to see trends

---

## 📞 Need Help?

Check these files:
- **Detailed docs**: `webhook-server/README.md`
- **Server logs**: Look at the terminal running `npm start`
- **Database**: Use `sqlite3 trustednutra.db` to query directly

Common commands:
```bash
# View recent orders in database
sqlite3 trustednutra.db "SELECT * FROM orders ORDER BY order_date DESC LIMIT 10"

# Count total orders
sqlite3 trustednutra.db "SELECT COUNT(*) FROM orders"

# Check server health
curl http://localhost:3000/health
```

---

## ✨ Features You Now Have

### Before Webhooks:
❌ Manual CSV downloads
❌ Delayed insights (hours/days old)
❌ Manual calculations
❌ Miss important events

### After Webhooks:
✅ Automatic data sync
✅ Real-time insights (seconds)
✅ Auto-calculations
✅ Instant alerts
✅ Historical + Live data combined
✅ Date filtering
✅ Product comparison
✅ Live order feed

---

**Ready to go live? Follow the 3 steps above!** 🚀
