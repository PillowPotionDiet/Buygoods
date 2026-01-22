const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'trustednutra.db');
let db;

// Initialize database
async function initializeDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
    console.log('✅ Existing database loaded');
  } else {
    db = new SQL.Database();
    console.log('✅ New database created');
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE NOT NULL,
      product_name TEXT NOT NULL,
      product_id TEXT,
      package_type TEXT,
      quantity INTEGER,
      amount DECIMAL(10,2),
      shipping DECIMAL(10,2),
      total DECIMAL(10,2),
      vendor_net DECIMAL(10,2),
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
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_order_date ON orders(order_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_product_name ON orders(product_name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_status ON orders(status)`);

  db.run(`
    CREATE TABLE IF NOT EXISTS refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      refund_amount DECIMAL(10,2),
      refund_reason TEXT,
      refund_date DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chargebacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      chargeback_amount DECIMAL(10,2),
      chargeback_reason TEXT,
      chargeback_date DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS daily_stats (
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Save to file
  saveDatabase();

  console.log('✅ Database initialized successfully');
  return db;
}

// Save database to file
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Insert order - returns object with .run() method for compatibility
const insertOrder = {
  run: function(orderData) {
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO orders (
          order_id, product_name, product_id, package_type, quantity,
          amount, shipping, total, vendor_net, customer_email, customer_name,
          customer_country, order_date, status, is_upsell, is_recurring, affiliate_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        orderData.order_id, orderData.product_name, orderData.product_id,
        orderData.package_type, orderData.quantity, orderData.amount,
        orderData.shipping, orderData.total, orderData.vendor_net || 0,
        orderData.customer_email, orderData.customer_name, orderData.customer_country,
        orderData.order_date, orderData.status, orderData.is_upsell,
        orderData.is_recurring, orderData.affiliate_id
      ]);

      stmt.free();
      saveDatabase();
    } catch (error) {
      console.error('Error inserting order:', error);
      throw error;
    }
  }
};

// Insert refund
const insertRefund = {
  run: function(refundData) {
    try {
      const stmt = db.prepare(`
        INSERT INTO refunds (order_id, refund_amount, refund_reason, refund_date)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run([refundData.order_id, refundData.refund_amount, refundData.refund_reason, refundData.refund_date]);
      stmt.free();
      saveDatabase();
    } catch (error) {
      console.error('Error inserting refund:', error);
      throw error;
    }
  }
};

// Insert chargeback
const insertChargeback = {
  run: function(chargebackData) {
    try {
      const stmt = db.prepare(`
        INSERT INTO chargebacks (order_id, chargeback_amount, chargeback_reason, chargeback_date)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run([chargebackData.order_id, chargebackData.chargeback_amount, chargebackData.chargeback_reason, chargebackData.chargeback_date]);
      stmt.free();
      saveDatabase();
    } catch (error) {
      console.error('Error inserting chargeback:', error);
      throw error;
    }
  }
};

// Update order status
const updateOrderStatus = {
  run: function(data) {
    try {
      const stmt = db.prepare(`
        UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `);
      stmt.run([data.status, data.order_id]);
      stmt.free();
      saveDatabase();
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }
};

// Get orders by date range
function getOrdersByDateRange(startDate, endDate, productName = null) {
  try {
    let query = `
      SELECT * FROM orders
      WHERE DATE(order_date) BETWEEN DATE(?) AND DATE(?)
      AND status = 'completed'
    `;
    const params = [startDate, endDate];

    if (productName) {
      query += ` AND product_name = ?`;
      params.push(productName);
    }

    query += ` ORDER BY order_date DESC`;

    const stmt = db.prepare(query);
    stmt.bind(params);

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    return results;
  } catch (error) {
    console.error('Error getting orders:', error);
    return [];
  }
}

// Get daily stats
function getDailyStats(startDate, endDate, productName = null) {
  try {
    let query = `
      SELECT
        DATE(order_date) as date,
        product_name,
        COUNT(*) as total_orders,
        SUM(total) as total_revenue,
        SUM(quantity) as total_units,
        AVG(total) as avg_order_value,
        SUM(CASE WHEN package_type LIKE '%2%bottle%' THEN 1 ELSE 0 END) as package_2bottle,
        SUM(CASE WHEN package_type LIKE '%3%bottle%' THEN 1 ELSE 0 END) as package_3bottle,
        SUM(CASE WHEN package_type LIKE '%6%bottle%' THEN 1 ELSE 0 END) as package_6bottle,
        SUM(is_upsell) as upgrades
      FROM orders
      WHERE DATE(order_date) BETWEEN DATE(?) AND DATE(?)
      AND status = 'completed'
    `;
    const params = [startDate, endDate];

    if (productName) {
      query += ` AND product_name = ?`;
      params.push(productName);
    }

    query += ` GROUP BY DATE(order_date), product_name ORDER BY date DESC`;

    const stmt = db.prepare(query);
    stmt.bind(params);

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    return results;
  } catch (error) {
    console.error('Error getting daily stats:', error);
    return [];
  }
}

// Get product summary
function getProductSummary(startDate, endDate) {
  try {
    const query = `
      SELECT
        product_name,
        COUNT(*) as total_orders,
        SUM(total) as total_revenue,
        SUM(vendor_net) as total_profit,
        SUM(quantity) as total_units,
        AVG(total) as avg_order_value,
        MIN(order_date) as first_order,
        MAX(order_date) as last_order,
        SUM(CASE WHEN package_type LIKE '%2%bottle%' THEN 1 ELSE 0 END) as package_2bottle,
        SUM(CASE WHEN package_type LIKE '%3%bottle%' THEN 1 ELSE 0 END) as package_3bottle,
        SUM(CASE WHEN package_type LIKE '%6%bottle%' THEN 1 ELSE 0 END) as package_6bottle,
        SUM(is_upsell) as upgrades
      FROM orders
      WHERE DATE(order_date) BETWEEN DATE(?) AND DATE(?)
      AND status = 'completed'
      GROUP BY product_name
    `;

    const stmt = db.prepare(query);
    stmt.bind([startDate, endDate]);

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    return results;
  } catch (error) {
    console.error('Error getting product summary:', error);
    return [];
  }
}

// Get recent orders
function getRecentOrders(limit = 20) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM orders
      WHERE status = 'completed'
      ORDER BY order_date DESC
      LIMIT ?
    `);
    stmt.bind([limit]);

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    return results;
  } catch (error) {
    console.error('Error getting recent orders:', error);
    return [];
  }
}

// Get total stats
function getTotalStats() {
  try {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total_orders,
        SUM(total) as total_revenue,
        SUM(quantity) as total_units,
        COUNT(DISTINCT product_name) as total_products,
        MIN(order_date) as first_order_date,
        MAX(order_date) as last_order_date
      FROM orders
      WHERE status = 'completed'
    `);
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();

    return result;
  } catch (error) {
    console.error('Error getting total stats:', error);
    return {};
  }
}

// Bulk insert orders
function bulkInsertOrders(orders) {
  try {
    for (const order of orders) {
      insertOrder(order);
    }
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error bulk inserting orders:', error);
    return false;
  }
}

module.exports = {
  db,
  initializeDatabase,
  insertOrder,
  insertRefund,
  insertChargeback,
  updateOrderStatus,
  getOrdersByDateRange,
  getDailyStats,
  getProductSummary,
  getRecentOrders,
  getTotalStats,
  bulkInsertOrders
};
