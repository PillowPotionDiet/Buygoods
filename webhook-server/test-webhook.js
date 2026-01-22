#!/usr/bin/env node

/**
 * Test Webhook Script
 *
 * This script helps you test the webhook endpoints locally
 * by sending sample order data to your server.
 *
 * Usage:
 *   node test-webhook.js                    # Send one test order
 *   node test-webhook.js --multiple 5       # Send 5 test orders
 *   node test-webhook.js --refund TEST123   # Test refund for order TEST123
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Sample order data
function generateTestOrder(index = 1) {
  const products = [
    { name: 'Meta Trim BHB', packages: ['2 Bottles', '3 Bottles', '6 Bottles'] },
    { name: 'Prosta Prime Support', packages: ['2 Bottles', '3 Bottles', '6 Bottles'] }
  ];

  const product = products[Math.floor(Math.random() * products.length)];
  const packageType = product.packages[Math.floor(Math.random() * product.packages.length)];

  let quantity = 1;
  let amount = 69;
  let shipping = 19.99;

  if (packageType === '2 Bottles') {
    quantity = 2;
    amount = 138;
    shipping = 19.99;
  } else if (packageType === '3 Bottles') {
    quantity = 3;
    amount = 177;
    shipping = 0;
  } else if (packageType === '6 Bottles') {
    quantity = 6;
    amount = 234;
    shipping = 0;
  }

  const total = amount + shipping;

  return {
    order_id: `TEST-${Date.now()}-${index}`,
    product_name: product.name,
    product_id: 'prod_123',
    package_type: packageType,
    amount: amount,
    shipping: shipping,
    total: total,
    customer_email: `customer${index}@example.com`,
    customer_name: `Test Customer ${index}`,
    first_name: 'Test',
    last_name: `Customer ${index}`,
    country: 'US',
    created_at: new Date().toISOString(),
    order_date: new Date().toISOString()
  };
}

// Send HTTP POST request
function sendRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data))
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

// Test new order webhook
async function testNewOrder(count = 1) {
  console.log(`\n📦 Testing NEW ORDER webhook (${count} order${count > 1 ? 's' : ''})...\n`);

  for (let i = 1; i <= count; i++) {
    const orderData = generateTestOrder(i);

    console.log(`[${i}/${count}] Sending test order:`);
    console.log(`  Product: ${orderData.product_name}`);
    console.log(`  Package: ${orderData.package_type}`);
    console.log(`  Total: $${orderData.total}`);
    console.log(`  Order ID: ${orderData.order_id}`);

    try {
      const response = await sendRequest('/webhook/new-order', orderData);

      if (response.status === 200) {
        console.log(`  ✅ Success!\n`);
      } else {
        console.log(`  ❌ Failed: ${response.status}\n`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }

    // Small delay between requests
    if (i < count) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

// Test refund webhook
async function testRefund(orderId) {
  console.log(`\n💰 Testing REFUND webhook for order: ${orderId}...\n`);

  const refundData = {
    order_id: orderId,
    amount: 157.99,
    refund_amount: 157.99,
    reason: 'Customer request',
    refund_date: new Date().toISOString()
  };

  try {
    const response = await sendRequest('/webhook/refund', refundData);

    if (response.status === 200) {
      console.log(`✅ Refund recorded successfully`);
      console.log(`   Order ${orderId} status updated to 'refunded'\n`);
    } else {
      console.log(`❌ Failed: ${response.status}\n`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }
}

// Test cancel webhook
async function testCancel(orderId) {
  console.log(`\n🚫 Testing CANCEL webhook for order: ${orderId}...\n`);

  const cancelData = {
    order_id: orderId,
    created_at: new Date().toISOString()
  };

  try {
    const response = await sendRequest('/webhook/cancel', cancelData);

    if (response.status === 200) {
      console.log(`✅ Cancellation recorded successfully`);
      console.log(`   Order ${orderId} status updated to 'cancelled'\n`);
    } else {
      console.log(`❌ Failed: ${response.status}\n`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }
}

// Test server health
async function testHealth() {
  console.log(`\n🏥 Testing server health...\n`);

  try {
    const url = new URL('/health', API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const data = JSON.parse(body);
          console.log(`✅ Server is healthy!`);
          console.log(`   Status: ${data.status}`);
          console.log(`   Uptime: ${Math.floor(data.uptime)}s\n`);
        } else {
          console.log(`❌ Server returned: ${res.statusCode}\n`);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Cannot connect to server at ${API_URL}`);
      console.log(`   Error: ${error.message}`);
      console.log(`\n💡 Make sure the server is running:`);
      console.log(`   cd webhook-server && npm start\n`);
    });

    req.end();
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  console.log(`
╔════════════════════════════════════════════╗
║   🧪 Webhook Testing Tool                 ║
║   Target: ${API_URL.padEnd(29)} ║
╚════════════════════════════════════════════╝
  `);

  // Parse arguments
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage:
  node test-webhook.js                    # Send one test order
  node test-webhook.js --multiple 5       # Send 5 test orders
  node test-webhook.js --refund TEST123   # Test refund for order TEST123
  node test-webhook.js --cancel TEST123   # Test cancel for order TEST123
  node test-webhook.js --health           # Check server health

Environment:
  API_URL=${API_URL}
  (Set different URL: API_URL=http://example.com:3000 node test-webhook.js)
    `);
    return;
  }

  if (args.includes('--health')) {
    await testHealth();
    return;
  }

  if (args.includes('--refund')) {
    const index = args.indexOf('--refund');
    const orderId = args[index + 1];
    if (!orderId) {
      console.log('❌ Please provide an order ID: --refund ORDER_ID\n');
      return;
    }
    await testRefund(orderId);
    return;
  }

  if (args.includes('--cancel')) {
    const index = args.indexOf('--cancel');
    const orderId = args[index + 1];
    if (!orderId) {
      console.log('❌ Please provide an order ID: --cancel ORDER_ID\n');
      return;
    }
    await testCancel(orderId);
    return;
  }

  if (args.includes('--multiple')) {
    const index = args.indexOf('--multiple');
    const count = parseInt(args[index + 1]) || 1;
    await testNewOrder(count);
  } else {
    await testNewOrder(1);
  }

  console.log(`✨ Done! Check your Analytics dashboard to see the test orders.\n`);
}

// Run
main().catch(console.error);
