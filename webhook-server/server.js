const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const {
  initializeDatabase,
  insertOrder,
  insertRefund,
  insertChargeback,
  updateOrderStatus,
  getOrdersByDateRange,
  getDailyStats,
  getProductSummary,
  getRecentOrders,
  getTotalStats
} = require('./database-sqljs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database (async)
let dbReady = false;
initializeDatabase().then(() => {
  dbReady = true;
  console.log('✅ Database ready for connections');
}).catch(err => {
  console.error('❌ Database initialization failed:', err);
  process.exit(1);
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== WEBHOOK ENDPOINTS ====================

// Helper function to parse package type and quantity
function parsePackageInfo(productName, packageType) {
  const name = (productName || '').toLowerCase();
  const pkg = (packageType || '').toLowerCase();

  let quantity = 1;
  let normalizedPackage = '1 Bottle';

  if (pkg.includes('6') || name.includes('6 bottle')) {
    quantity = 6;
    normalizedPackage = '6 Bottles';
  } else if (pkg.includes('3') || name.includes('3 bottle')) {
    quantity = 3;
    normalizedPackage = '3 Bottles';
  } else if (pkg.includes('2') || name.includes('2 bottle')) {
    quantity = 2;
    normalizedPackage = '2 Bottles';
  } else if (pkg.includes('upgrade') || name.includes('upgrade')) {
    quantity = 1;
    normalizedPackage = '1 Bottle (Upgrade)';
  }

  return { quantity, normalizedPackage };
}

// Helper function to extract product name
function extractProductName(productName) {
  const name = productName || '';

  // Map variations to standard names
  if (name.toLowerCase().includes('meta') || name.toLowerCase().includes('trim')) {
    return 'Meta Trim BHB';
  } else if (name.toLowerCase().includes('prosta') && name.toLowerCase().includes('prime')) {
    return 'Prosta Prime Support';
  }

  // Return original if no match
  return name;
}

// 1. NEW ORDER WEBHOOK
app.post('/webhook/new-order', (req, res) => {
  try {
    console.log('📦 New order received:');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));

    const data = req.body;
    const { quantity, normalizedPackage } = parsePackageInfo(data.product_name, data.package_type);

    const orderData = {
      order_id: data.order_id || data.id || data.register_id || `BG-${Date.now()}`,
      product_name: extractProductName(data.product_name || data.product),
      product_id: data.product_id || data.sku || null,
      package_type: normalizedPackage,
      quantity: quantity,
      amount: parseFloat(data.amount || data.subtotal || data.product_price || 0),
      shipping: parseFloat(data.shipping || data.shipping_cost_total || 0),
      total: parseFloat(data.total || data.order_total || data.total_comma || 0),
      customer_email: data.customer_email || data.email || data.shipping_email || 'unknown@email.com',
      customer_name: data.customer_name || data.shipping_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown',
      customer_country: data.country || data.customer_country || data.country_2letter || data.shipping_country || 'US',
      order_date: data.created_at || data.order_date || data.timestamp || new Date().toISOString(),
      status: data.payment_status === 'Complete' || data.payment_status === 'Completed' ? 'completed' : 'completed',
      is_upsell: data.is_upsell || (normalizedPackage.includes('Upgrade') ? 1 : 0),
      is_recurring: data.is_recurring || data.RUNNING_OFFLINE === '1' ? 1 : 0,
      affiliate_id: data.affiliate_id || data.aff_id || null
    };

    insertOrder.run(orderData);

    console.log('✅ Order saved to database:', orderData.order_id);

    res.status(200).json({
      success: true,
      message: 'Order received',
      order_id: orderData.order_id
    });

  } catch (error) {
    console.error('❌ Error processing new order:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. ORDER REFUND WEBHOOK
app.post('/webhook/refund', (req, res) => {
  try {
    console.log('💰 Refund received:', req.body);

    const data = req.body;

    const refundData = {
      order_id: data.order_id || data.id,
      refund_amount: parseFloat(data.refund_amount || data.amount || 0),
      refund_reason: data.reason || data.refund_reason || 'Customer request',
      refund_date: data.refund_date || data.created_at || new Date().toISOString()
    };

    insertRefund.run(refundData);

    // Update order status
    updateOrderStatus.run({
      order_id: refundData.order_id,
      status: 'refunded'
    });

    console.log('✅ Refund recorded:', refundData.order_id);

    res.status(200).json({ success: true, message: 'Refund recorded' });

  } catch (error) {
    console.error('❌ Error processing refund:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. ORDER CANCEL WEBHOOK
app.post('/webhook/cancel', (req, res) => {
  try {
    console.log('🚫 Order cancelled:', req.body);

    const data = req.body;

    updateOrderStatus.run({
      order_id: data.order_id || data.id,
      status: 'cancelled'
    });

    console.log('✅ Order cancelled:', data.order_id);

    res.status(200).json({ success: true, message: 'Order cancelled' });

  } catch (error) {
    console.error('❌ Error processing cancellation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. ORDER CHARGEBACK WEBHOOK
app.post('/webhook/chargeback', (req, res) => {
  try {
    console.log('⚠️ Chargeback received:', req.body);

    const data = req.body;

    const chargebackData = {
      order_id: data.order_id || data.id,
      chargeback_amount: parseFloat(data.amount || data.chargeback_amount || 0),
      chargeback_reason: data.reason || 'Chargeback filed',
      chargeback_date: data.chargeback_date || data.created_at || new Date().toISOString()
    };

    insertChargeback.run(chargebackData);

    // Update order status
    updateOrderStatus.run({
      order_id: chargebackData.order_id,
      status: 'chargeback'
    });

    console.log('✅ Chargeback recorded:', chargebackData.order_id);

    res.status(200).json({ success: true, message: 'Chargeback recorded' });

  } catch (error) {
    console.error('❌ Error processing chargeback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. ORDER FULFILLED WEBHOOK
app.post('/webhook/fulfilled', (req, res) => {
  try {
    console.log('📬 Order fulfilled:', req.body);

    const data = req.body;

    updateOrderStatus.run({
      order_id: data.order_id || data.id,
      status: 'fulfilled'
    });

    console.log('✅ Order marked as fulfilled:', data.order_id);

    res.status(200).json({ success: true, message: 'Order fulfilled' });

  } catch (error) {
    console.error('❌ Error processing fulfillment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. RECURRING CHARGE WEBHOOK
app.post('/webhook/recurring', (req, res) => {
  try {
    console.log('🔄 Recurring charge:', req.body);

    const data = req.body;
    const { quantity, normalizedPackage } = parsePackageInfo(data.product_name, data.package_type);

    const orderData = {
      order_id: data.order_id || data.id || `REC-${Date.now()}`,
      product_name: extractProductName(data.product_name),
      product_id: data.product_id || null,
      package_type: normalizedPackage,
      quantity: quantity,
      amount: parseFloat(data.amount || 0),
      shipping: parseFloat(data.shipping || 0),
      total: parseFloat(data.total || 0),
      customer_email: data.customer_email || data.email,
      customer_name: data.customer_name || '',
      customer_country: data.country || 'US',
      order_date: data.created_at || new Date().toISOString(),
      status: 'completed',
      is_upsell: 0,
      is_recurring: 1,
      affiliate_id: data.affiliate_id || null
    };

    insertOrder.run(orderData);

    console.log('✅ Recurring order saved:', orderData.order_id);

    res.status(200).json({ success: true, message: 'Recurring charge recorded' });

  } catch (error) {
    console.error('❌ Error processing recurring charge:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Alias: /webhook/cancellation (for Buygoods compatibility)
app.post('/webhook/cancellation', (req, res) => {
  try {
    console.log('🚫 Order cancellation:', req.body);

    const data = req.body;

    updateOrderStatus.run({
      order_id: data.order_id || data.id || data.register_id,
      status: 'cancelled'
    });

    console.log('✅ Order cancelled:', data.order_id);

    res.status(200).json({ success: true, message: 'Order cancelled' });

  } catch (error) {
    console.error('❌ Error processing cancellation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Alias: /webhook/recurring-order (for Buygoods compatibility)
app.post('/webhook/recurring-order', (req, res) => {
  try {
    console.log('🔄 Recurring order:');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));

    const data = req.body;
    const { quantity, normalizedPackage } = parsePackageInfo(data.product_name || data.product, data.package_type);

    const orderData = {
      order_id: data.order_id || data.id || data.register_id || `REC-${Date.now()}`,
      product_name: extractProductName(data.product_name || data.product),
      product_id: data.product_id || data.sku || null,
      package_type: normalizedPackage,
      quantity: quantity,
      amount: parseFloat(data.amount || data.subtotal || data.product_price || 0),
      shipping: parseFloat(data.shipping || data.shipping_cost_total || 0),
      total: parseFloat(data.total || data.order_total || data.total_comma || 0),
      customer_email: data.customer_email || data.email || data.shipping_email || 'unknown@email.com',
      customer_name: data.customer_name || data.shipping_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown',
      customer_country: data.country || data.customer_country || data.country_2letter || data.shipping_country || 'US',
      order_date: data.created_at || data.order_date || data.timestamp || new Date().toISOString(),
      status: 'completed',
      is_upsell: 0,
      is_recurring: 1,
      affiliate_id: data.affiliate_id || data.aff_id || null
    };

    insertOrder.run(orderData);

    console.log('✅ Recurring order saved:', orderData.order_id);

    res.status(200).json({ success: true, message: 'Recurring order recorded' });

  } catch (error) {
    console.error('❌ Error processing recurring order:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== API ENDPOINTS FOR DASHBOARD ====================

// Get orders by date range
app.get('/api/orders', (req, res) => {
  try {
    const { start_date, end_date, product } = req.query;

    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const orders = getOrdersByDateRange(startDate, endDate, product || null);

    res.json({
      success: true,
      data: orders,
      count: orders.length
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get daily stats
app.get('/api/stats/daily', (req, res) => {
  try {
    const { start_date, end_date, product } = req.query;

    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const stats = getDailyStats(startDate, endDate, product || null);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching daily stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get product summary
app.get('/api/stats/products', (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const summary = getProductSummary(startDate, endDate);

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error fetching product summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get recent orders (live feed)
app.get('/api/orders/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const orders = getRecentOrders(limit);

    res.json({
      success: true,
      data: orders
    });

  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get total stats
app.get('/api/stats/total', (req, res) => {
  try {
    const stats = getTotalStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching total stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'TrustedNutra Webhook Server',
    version: '1.0.0',
    endpoints: {
      webhooks: [
        'POST /webhook/new-order',
        'POST /webhook/refund',
        'POST /webhook/cancel',
        'POST /webhook/chargeback',
        'POST /webhook/fulfilled',
        'POST /webhook/recurring'
      ],
      api: [
        'GET /api/orders',
        'GET /api/stats/daily',
        'GET /api/stats/products',
        'GET /api/orders/recent',
        'GET /api/stats/total'
      ]
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║   🚀 TrustedNutra Webhook Server Running          ║
║                                                    ║
║   Port: ${PORT}                                        ║
║   Environment: ${process.env.NODE_ENV || 'development'}                           ║
║                                                    ║
║   Webhook URLs to configure in Buygoods:          ║
║   ├─ New Order:    http://YOUR_SERVER:${PORT}/webhook/new-order    ║
║   ├─ Refund:       http://YOUR_SERVER:${PORT}/webhook/refund       ║
║   ├─ Cancel:       http://YOUR_SERVER:${PORT}/webhook/cancel       ║
║   ├─ Chargeback:   http://YOUR_SERVER:${PORT}/webhook/chargeback   ║
║   ├─ Fulfilled:    http://YOUR_SERVER:${PORT}/webhook/fulfilled    ║
║   └─ Recurring:    http://YOUR_SERVER:${PORT}/webhook/recurring    ║
║                                                    ║
║   API Endpoints:                                   ║
║   └─ Health: http://localhost:${PORT}/health                ║
║                                                    ║
╚════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
