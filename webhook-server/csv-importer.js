const fs = require('fs');
const path = require('path');
const { bulkInsertOrders } = require('./database');

// Helper function to parse CSV
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    data.push(row);
  }

  return data;
}

// Helper to parse package type and quantity from Buygoods CSV
function parsePackageFromCSV(productName, itemName) {
  const combined = `${productName} ${itemName}`.toLowerCase();

  let quantity = 1;
  let normalizedPackage = '1 Bottle';

  if (combined.includes('6 bottle') || combined.includes('6bottle')) {
    quantity = 6;
    normalizedPackage = '6 Bottles';
  } else if (combined.includes('3 bottle') || combined.includes('3bottle')) {
    quantity = 3;
    normalizedPackage = '3 Bottles';
  } else if (combined.includes('2 bottle') || combined.includes('2bottle')) {
    quantity = 2;
    normalizedPackage = '2 Bottles';
  } else if (combined.includes('upgrade')) {
    quantity = 1;
    normalizedPackage = '1 Bottle (Upgrade)';
  } else if (combined.includes('3 bottles')) {
    quantity = 3;
    normalizedPackage = '3 Bottles (Upgrade)';
  }

  return { quantity, normalizedPackage };
}

// Extract product name
function extractProductName(productName) {
  const name = (productName || '').trim();

  if (name.toLowerCase().includes('meta') || name.toLowerCase().includes('trim')) {
    return 'Meta Trim BHB';
  } else if (name.toLowerCase().includes('prosta') && name.toLowerCase().includes('prime')) {
    return 'Prosta Prime Support';
  }

  return name;
}

// Parse date from Buygoods CSV format
function parseDate(dateStr) {
  try {
    // Buygoods format: "1/8/2026" or similar
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}T12:00:00Z`;
    }
    return new Date().toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

// Import Buygoods CSV format
function importBuygoodsCSV(csvFilePath) {
  try {
    console.log(`📂 Reading CSV file: ${csvFilePath}`);

    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    const rows = parseCSV(csvContent);

    console.log(`📊 Found ${rows.length} rows in CSV`);

    const orders = rows.map(row => {
      const { quantity, normalizedPackage } = parsePackageFromCSV(
        row['Product Name'] || row['Product'],
        row['Item Name'] || row['Item']
      );

      // Parse amounts - remove $ and convert to float
      const parseAmount = (val) => {
        if (!val) return 0;
        return parseFloat(val.toString().replace(/[$,]/g, '')) || 0;
      };

      return {
        order_id: row['Order #'] || row['Order ID'] || `IMP-${Date.now()}-${Math.random()}`,
        product_name: extractProductName(row['Product Name'] || row['Product']),
        product_id: null,
        package_type: normalizedPackage,
        quantity: quantity,
        amount: parseAmount(row['Item Total'] || row['Amount'] || row['Subtotal']),
        shipping: parseAmount(row['Shipping'] || 0),
        total: parseAmount(row['Total'] || row['Order Total']),
        customer_email: row['Email'] || row['Customer Email'] || 'imported@example.com',
        customer_name: row['Customer Name'] || row['Name'] || 'Imported Customer',
        customer_country: row['Country'] || 'US',
        order_date: parseDate(row['Date'] || row['Order Date']),
        status: 'completed',
        is_upsell: normalizedPackage.includes('Upgrade') ? 1 : 0,
        is_recurring: 0,
        affiliate_id: null
      };
    });

    console.log(`💾 Importing ${orders.length} orders into database...`);

    bulkInsertOrders(orders);

    console.log(`✅ Successfully imported ${orders.length} orders from ${path.basename(csvFilePath)}`);

    return {
      success: true,
      imported: orders.length,
      file: path.basename(csvFilePath)
    };

  } catch (error) {
    console.error('❌ Error importing CSV:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Import all CSV files from a directory
function importAllCSVs(directoryPath) {
  try {
    const files = fs.readdirSync(directoryPath);
    const csvFiles = files.filter(f => f.endsWith('.csv'));

    console.log(`📁 Found ${csvFiles.length} CSV files in ${directoryPath}`);

    const results = [];

    for (const file of csvFiles) {
      const filePath = path.join(directoryPath, file);
      const result = importBuygoodsCSV(filePath);
      results.push(result);
    }

    const totalImported = results.reduce((sum, r) => sum + (r.imported || 0), 0);

    console.log(`
╔════════════════════════════════════════════╗
║   ✅ CSV Import Complete                  ║
║                                            ║
║   Files Processed: ${csvFiles.length}                      ║
║   Total Orders Imported: ${totalImported}              ║
║                                            ║
╚════════════════════════════════════════════╝
    `);

    return results;

  } catch (error) {
    console.error('❌ Error reading directory:', error);
    return { success: false, error: error.message };
  }
}

// Command line usage
if (require.main === module) {
  const { initializeDatabase } = require('./database');

  // Initialize database first
  initializeDatabase();

  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  node csv-importer.js <file-or-directory>

Examples:
  node csv-importer.js "../Sales Record/OrdersReportMetaTrimTillJan-17_01-21-2026_7_11943.csv"
  node csv-importer.js "../Sales Record"
    `);
    process.exit(1);
  }

  const target = args[0];
  const targetPath = path.resolve(target);

  if (!fs.existsSync(targetPath)) {
    console.error(`❌ Path not found: ${targetPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(targetPath);

  if (stats.isDirectory()) {
    importAllCSVs(targetPath);
  } else if (stats.isFile() && targetPath.endsWith('.csv')) {
    importBuygoodsCSV(targetPath);
  } else {
    console.error('❌ Please provide a CSV file or directory containing CSV files');
    process.exit(1);
  }
}

module.exports = {
  importBuygoodsCSV,
  importAllCSVs
};
