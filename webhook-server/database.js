const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
const db = new Database(path.join(__dirname, 'trustednutra.db'));

// Create tables
function initializeDatabase() {
  // Orders table - stores all order data
  db.exec(`
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

  // Create index on order_date for faster queries
  db.exec(`CREATE INDEX IF NOT EXISTS idx_order_date ON orders(order_date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_product_name ON orders(product_name)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_status ON orders(status)`);

  // Refunds table
  db.exec(`
    CREATE TABLE IF NOT EXISTS refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      refund_amount DECIMAL(10,2),
      refund_reason TEXT,
      refund_date DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
    )
  `);

  // Chargebacks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chargebacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      chargeback_amount DECIMAL(10,2),
      chargeback_reason TEXT,
      chargeback_date DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
    )
  `);

  // Daily stats cache table (for performance)
  db.exec(`
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, product_name)
    )
  `);

  console.log('✅ Database initialized successfully');
}

// Insert new order
const insertOrder = db.prepare(`
  INSERT OR REPLACE INTO orders (
    order_id, product_name, product_id, package_type, quantity,
    amount, shipping, total, customer_email, customer_name,
    customer_country, order_date, status, is_upsell, is_recurring, affiliate_id
  ) VALUES (
    @order_id, @product_name, @product_id, @package_type, @quantity,
    @amount, @shipping, @total, @customer_email, @customer_name,
    @customer_country, @order_date, @status, @is_upsell, @is_recurring, @affiliate_id
  )
`);

// Insert refund
const insertRefund = db.prepare(`
  INSERT INTO refunds (order_id, refund_amount, refund_reason, refund_date)
  VALUES (@order_id, @refund_amount, @refund_reason, @refund_date)
`);

// Insert chargeback
const insertChargeback = db.prepare(`
  INSERT INTO chargebacks (order_id, chargeback_amount, chargeback_reason, chargeback_date)
  VALUES (@order_id, @chargeback_amount, @chargeback_reason, @chargeback_date)
`);

// Update order status
const updateOrderStatus = db.prepare(`
  UPDATE orders SET status = @status, updated_at = CURRENT_TIMESTAMP
  WHERE order_id = @order_id
`);

// Get orders by date range
function getOrdersByDateRange(startDate, endDate, productName = null) {
  let query = `
    SELECT * FROM orders
    WHERE DATE(order_date) BETWEEN DATE(@startDate) AND DATE(@endDate)
    AND status = 'completed'
  `;

  if (productName) {
    query += ` AND product_name = @productName`;
  }

  query += ` ORDER BY order_date DESC`;

  const stmt = db.prepare(query);
  return productName
    ? stmt.all({ startDate, endDate, productName })
    : stmt.all({ startDate, endDate });
}

// Get daily stats
function getDailyStats(startDate, endDate, productName = null) {
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
    WHERE DATE(order_date) BETWEEN DATE(@startDate) AND DATE(@endDate)
    AND status = 'completed'
  `;

  if (productName) {
    query += ` AND product_name = @productName`;
  }

  query += ` GROUP BY DATE(order_date), product_name ORDER BY date DESC`;

  const stmt = db.prepare(query);
  return productName
    ? stmt.all({ startDate, endDate, productName })
    : stmt.all({ startDate, endDate });
}

// Get product summary
function getProductSummary(startDate, endDate) {
  const query = `
    SELECT
      product_name,
      COUNT(*) as total_orders,
      SUM(total) as total_revenue,
      SUM(quantity) as total_units,
      AVG(total) as avg_order_value,
      MIN(order_date) as first_order,
      MAX(order_date) as last_order,
      SUM(CASE WHEN package_type LIKE '%2%bottle%' THEN 1 ELSE 0 END) as package_2bottle,
      SUM(CASE WHEN package_type LIKE '%3%bottle%' THEN 1 ELSE 0 END) as package_3bottle,
      SUM(CASE WHEN package_type LIKE '%6%bottle%' THEN 1 ELSE 0 END) as package_6bottle,
      SUM(is_upsell) as upgrades
    FROM orders
    WHERE DATE(order_date) BETWEEN DATE(@startDate) AND DATE(@endDate)
    AND status = 'completed'
    GROUP BY product_name
  `;

  const stmt = db.prepare(query);
  return stmt.all({ startDate, endDate });
}

// Get recent orders (for live feed)
function getRecentOrders(limit = 20) {
  const stmt = db.prepare(`
    SELECT * FROM orders
    WHERE status = 'completed'
    ORDER BY order_date DESC
    LIMIT @limit
  `);
  return stmt.all({ limit });
}

// Get total stats
function getTotalStats() {
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
  return stmt.get();
}

// Bulk insert orders (for CSV import)
function bulkInsertOrders(orders) {
  const transaction = db.transaction((orderList) => {
    for (const order of orderList) {
      insertOrder.run(order);
    }
  });

  transaction(orders);
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
