# 📡 API Documentation - TrustedNutra Webhook Server

## Base URL
```
http://localhost:3000
```
*Replace with your production URL when deployed*

---

## 🎯 Webhook Endpoints (Receive from Buygoods)

These endpoints receive data from Buygoods when events occur.

### 1. New Order Webhook

**Endpoint**: `POST /webhook/new-order`

**Description**: Receives new order data from Buygoods

**Request Body**:
```json
{
  "order_id": "123456",
  "product_name": "Meta Trim BHB",
  "product_id": "prod_789",
  "package_type": "3 Bottles",
  "amount": 177.00,
  "shipping": 0.00,
  "total": 177.00,
  "customer_email": "customer@example.com",
  "customer_name": "John Doe",
  "first_name": "John",
  "last_name": "Doe",
  "country": "US",
  "created_at": "2026-01-21T10:30:00Z",
  "is_upsell": 0,
  "is_recurring": 0,
  "affiliate_id": "aff_123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Order received",
  "order_id": "123456"
}
```

**Status Codes**:
- `200`: Success
- `500`: Server error

---

### 2. Refund Webhook

**Endpoint**: `POST /webhook/refund`

**Description**: Receives refund notifications

**Request Body**:
```json
{
  "order_id": "123456",
  "refund_amount": 177.00,
  "reason": "Customer request",
  "refund_date": "2026-01-21T10:30:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Refund recorded"
}
```

**Side Effects**:
- Updates order status to `"refunded"`
- Creates entry in `refunds` table

---

### 3. Cancel Webhook

**Endpoint**: `POST /webhook/cancel`

**Description**: Receives order cancellation notifications

**Request Body**:
```json
{
  "order_id": "123456",
  "created_at": "2026-01-21T10:30:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Order cancelled"
}
```

**Side Effects**:
- Updates order status to `"cancelled"`

---

### 4. Chargeback Webhook

**Endpoint**: `POST /webhook/chargeback`

**Description**: Receives chargeback notifications

**Request Body**:
```json
{
  "order_id": "123456",
  "chargeback_amount": 177.00,
  "reason": "Chargeback filed",
  "chargeback_date": "2026-01-21T10:30:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Chargeback recorded"
}
```

**Side Effects**:
- Updates order status to `"chargeback"`
- Creates entry in `chargebacks` table

---

### 5. Fulfilled Webhook

**Endpoint**: `POST /webhook/fulfilled`

**Description**: Receives order fulfillment notifications

**Request Body**:
```json
{
  "order_id": "123456",
  "created_at": "2026-01-21T10:30:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Order fulfilled"
}
```

**Side Effects**:
- Updates order status to `"fulfilled"`

---

### 6. Recurring Charge Webhook

**Endpoint**: `POST /webhook/recurring`

**Description**: Receives recurring subscription charge notifications

**Request Body**:
```json
{
  "order_id": "REC-123456",
  "product_name": "Meta Trim BHB",
  "package_type": "3 Bottles",
  "amount": 177.00,
  "shipping": 0.00,
  "total": 177.00,
  "customer_email": "customer@example.com",
  "customer_name": "John Doe",
  "country": "US",
  "created_at": "2026-01-21T10:30:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Recurring charge recorded"
}
```

**Side Effects**:
- Creates new order with `is_recurring = 1`

---

## 📊 REST API Endpoints (For Dashboard)

These endpoints are used by the Analytics dashboard to fetch data.

### 1. Get Orders

**Endpoint**: `GET /api/orders`

**Description**: Retrieve orders within a date range

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string | No | Start date (YYYY-MM-DD). Default: 30 days ago |
| `end_date` | string | No | End date (YYYY-MM-DD). Default: today |
| `product` | string | No | Filter by product name |

**Example Request**:
```
GET /api/orders?start_date=2026-01-08&end_date=2026-01-17&product=Meta Trim BHB
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "order_id": "123456",
      "product_name": "Meta Trim BHB",
      "package_type": "3 Bottles",
      "quantity": 3,
      "amount": 177.00,
      "shipping": 0.00,
      "total": 177.00,
      "customer_email": "customer@example.com",
      "customer_name": "John Doe",
      "customer_country": "US",
      "order_date": "2026-01-15T10:30:00Z",
      "status": "completed",
      "is_upsell": 0,
      "is_recurring": 0,
      "created_at": "2026-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

---

### 2. Get Daily Stats

**Endpoint**: `GET /api/stats/daily`

**Description**: Get aggregated daily statistics

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string | No | Start date (YYYY-MM-DD). Default: 30 days ago |
| `end_date` | string | No | End date (YYYY-MM-DD). Default: today |
| `product` | string | No | Filter by product name |

**Example Request**:
```
GET /api/stats/daily?start_date=2026-01-08&end_date=2026-01-17
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-01-15",
      "product_name": "Meta Trim BHB",
      "total_orders": 5,
      "total_revenue": 885.00,
      "total_units": 15,
      "avg_order_value": 177.00,
      "package_2bottle": 2,
      "package_3bottle": 2,
      "package_6bottle": 1,
      "upgrades": 0
    },
    {
      "date": "2026-01-14",
      "product_name": "Meta Trim BHB",
      "total_orders": 3,
      "total_revenue": 531.00,
      "total_units": 9,
      "avg_order_value": 177.00,
      "package_2bottle": 1,
      "package_3bottle": 2,
      "package_6bottle": 0,
      "upgrades": 0
    }
  ]
}
```

---

### 3. Get Product Summary

**Endpoint**: `GET /api/stats/products`

**Description**: Get aggregated statistics by product

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string | No | Start date (YYYY-MM-DD). Default: 30 days ago |
| `end_date` | string | No | End date (YYYY-MM-DD). Default: today |

**Example Request**:
```
GET /api/stats/products?start_date=2026-01-08&end_date=2026-01-17
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "product_name": "Meta Trim BHB",
      "total_orders": 34,
      "total_revenue": 5985.00,
      "total_units": 83,
      "avg_order_value": 176.03,
      "first_order": "2026-01-08T08:15:00Z",
      "last_order": "2026-01-17T16:45:00Z",
      "package_2bottle": 15,
      "package_3bottle": 11,
      "package_6bottle": 7,
      "upgrades": 1
    },
    {
      "product_name": "Prosta Prime Support",
      "total_orders": 7,
      "total_revenue": 1407.00,
      "total_units": 28,
      "avg_order_value": 201.00,
      "first_order": "2025-12-28T10:00:00Z",
      "last_order": "2026-01-14T14:30:00Z",
      "package_2bottle": 0,
      "package_3bottle": 2,
      "package_6bottle": 3,
      "upgrades": 2
    }
  ]
}
```

---

### 4. Get Recent Orders

**Endpoint**: `GET /api/orders/recent`

**Description**: Get most recent orders (for live feed)

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 20 | Number of orders to return |

**Example Request**:
```
GET /api/orders/recent?limit=10
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 41,
      "order_id": "123456",
      "product_name": "Meta Trim BHB",
      "package_type": "3 Bottles",
      "quantity": 3,
      "total": 177.00,
      "customer_country": "US",
      "order_date": "2026-01-21T10:30:00Z",
      "status": "completed"
    }
  ]
}
```

---

### 5. Get Total Stats

**Endpoint**: `GET /api/stats/total`

**Description**: Get overall statistics across all time

**Example Request**:
```
GET /api/stats/total
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total_orders": 41,
    "total_revenue": 7392.00,
    "total_units": 111,
    "total_products": 2,
    "first_order_date": "2025-12-28T10:00:00Z",
    "last_order_date": "2026-01-21T10:30:00Z"
  }
}
```

---

### 6. Health Check

**Endpoint**: `GET /health`

**Description**: Check if server is running

**Example Request**:
```
GET /health
```

**Response**:
```json
{
  "status": "OK",
  "timestamp": "2026-01-21T10:30:00.000Z",
  "uptime": 3600
}
```

---

## 🗄️ Database Schema

### Orders Table
```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  product_id TEXT,
  package_type TEXT,
  quantity INTEGER,
  amount DECIMAL(10,2),
  shipping DECIMAL(10,2),
  total DECIMAL(10,2),
  customer_email TEXT,
  customer_name TEXT,
  customer_country TEXT,
  order_date DATETIME NOT NULL,
  status TEXT DEFAULT 'completed',
  is_upsell INTEGER DEFAULT 0,
  is_recurring INTEGER DEFAULT 0,
  affiliate_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `idx_order_date` on `order_date`
- `idx_product_name` on `product_name`
- `idx_status` on `status`

---

### Refunds Table
```sql
CREATE TABLE refunds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  refund_amount DECIMAL(10,2),
  refund_reason TEXT,
  refund_date DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
```

---

### Chargebacks Table
```sql
CREATE TABLE chargebacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  chargeback_amount DECIMAL(10,2),
  chargeback_reason TEXT,
  chargeback_date DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
```

---

### Daily Stats Table (Cache)
```sql
CREATE TABLE daily_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  product_name TEXT NOT NULL,
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_units INTEGER DEFAULT 0,
  avg_order_value DECIMAL(10,2) DEFAULT 0,
  package_2bottle INTEGER DEFAULT 0,
  package_3bottle INTEGER DEFAULT 0,
  package_6bottle INTEGER DEFAULT 0,
  upgrades INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, product_name)
);
```

---

## 🔐 Authentication & Security

### Current Implementation
- **No authentication required** (designed for internal use)
- Rate limiting: None
- CORS: Enabled for all origins

### Production Recommendations

#### 1. Add Webhook Signature Verification
```javascript
// In webhook endpoints
const crypto = require('crypto');

function verifyWebhookSignature(req) {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET;

  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  return signature === hash;
}
```

#### 2. Add API Key Authentication
```javascript
// In API endpoints
function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
```

#### 3. Enable HTTPS
Use reverse proxy (nginx) with SSL certificate:
```nginx
server {
  listen 443 ssl;
  server_name webhooks.yoursite.com;

  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;

  location / {
    proxy_pass http://localhost:3000;
  }
}
```

#### 4. Restrict CORS
```javascript
// In server.js
app.use(cors({
  origin: ['https://yourdomain.com', 'https://analytics.yourdomain.com']
}));
```

---

## 📈 Rate Limits

### Current Limits
- **None** (unlimited requests)

### Recommended Production Limits
- Webhooks: 100 requests/minute per IP
- API: 1000 requests/hour per IP

**Implementation**:
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100
});

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000
});

app.use('/webhook', webhookLimiter);
app.use('/api', apiLimiter);
```

---

## 🧪 Testing with cURL

### Test New Order
```bash
curl -X POST http://localhost:3000/webhook/new-order \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "TEST-001",
    "product_name": "Meta Trim BHB",
    "package_type": "3 Bottles",
    "amount": 177.00,
    "shipping": 0.00,
    "total": 177.00,
    "customer_email": "test@example.com",
    "customer_name": "Test User",
    "country": "US",
    "created_at": "2026-01-21T10:30:00Z"
  }'
```

### Test Get Orders
```bash
curl "http://localhost:3000/api/orders?start_date=2026-01-01&end_date=2026-01-31"
```

### Test Get Product Stats
```bash
curl "http://localhost:3000/api/stats/products?start_date=2026-01-01&end_date=2026-01-31"
```

### Test Health Check
```bash
curl http://localhost:3000/health
```

---

## 🐛 Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common Error Codes
| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid JSON, missing fields |
| 404 | Not Found | Invalid endpoint |
| 500 | Server Error | Database error, unexpected exception |

---

## 📊 Performance Considerations

### Database Optimization
- SQLite handles 100,000+ orders efficiently
- Indexes on frequently queried columns
- Prepared statements for all queries

### Caching
- Consider implementing Redis for heavy traffic
- Cache product summaries for 1-5 minutes

### Scaling
- Current setup: Single server, ~1000 req/min
- For higher load: Add load balancer + multiple instances
- Database: Migrate to PostgreSQL for 10k+ req/min

---

## 📝 Changelog

### v1.0.0 (2026-01-21)
- Initial release
- 6 webhook endpoints
- 6 API endpoints
- SQLite database
- CSV import functionality
- Auto-refresh dashboard integration

---

## 📞 Support

For issues or questions:
1. Check server logs: `pm2 logs trustednutra`
2. Test connection: `curl http://localhost:3000/health`
3. Query database: `sqlite3 trustednutra.db`
4. Review documentation: `README.md`

---

**API Version**: 1.0.0
**Last Updated**: January 21, 2026
