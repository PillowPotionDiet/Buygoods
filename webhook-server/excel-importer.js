const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { initializeDatabase, insertOrder } = require('./database-sqljs');

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

// Parse package type and quantity
function parsePackageInfo(productName, itemName) {
  const combined = `${productName} ${itemName}`.toLowerCase();

  let quantity = 1;
  let normalizedPackage = '1 Bottle';

  if (combined.includes('6 bottle') || combined.includes('6bottle') || combined.includes('6-bottle')) {
    quantity = 6;
    normalizedPackage = '6 Bottles';
  } else if (combined.includes('3 bottle') || combined.includes('3bottle') || combined.includes('3-bottle')) {
    quantity = 3;
    normalizedPackage = '3 Bottles';
  } else if (combined.includes('2 bottle') || combined.includes('2bottle') || combined.includes('2-bottle')) {
    quantity = 2;
    normalizedPackage = '2 Bottles';
  } else if (combined.includes('upgrade')) {
    quantity = 1;
    normalizedPackage = '1 Bottle (Upgrade)';
  }

  return { quantity, normalizedPackage };
}

// Parse date from various formats
function parseDate(dateStr) {
  try {
    if (!dateStr) return new Date().toISOString();

    // Handle Excel serial date
    if (typeof dateStr === 'number') {
      const date = XLSX.SSF.parse_date_code(dateStr);
      return new Date(date.y, date.m - 1, date.d, 12, 0, 0).toISOString();
    }

    // Handle string dates like "1/8/2026"
    const parts = dateStr.toString().split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}T12:00:00Z`;
    }

    return new Date(dateStr).toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

// Parse amount
function parseAmount(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  return parseFloat(val.toString().replace(/[$,]/g, '')) || 0;
}

// Import Excel file
async function importExcelFile(filePath) {
  try {
    console.log(`📂 Reading Excel file: ${filePath}`);

    // Read the workbook
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${rows.length} rows in Excel file`);

    if (rows.length === 0) {
      console.log('⚠️ No data found in Excel file');
      return { success: true, imported: 0 };
    }

    // Log first row to see structure
    console.log('📋 Sample row structure:', Object.keys(rows[0]));

    let imported = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        // Map Excel columns to database fields
        const productName = row['Product Name'] || row['Product'] || '';
        const itemName = row['Item Name'] || row['Item'] || '';
        const { quantity, normalizedPackage } = parsePackageInfo(productName, itemName);

        const orderData = {
          order_id: row['Order #'] || row['Order ID'] || row['OrderID'] || `IMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          product_name: extractProductName(productName),
          product_id: row['Product ID'] || row['SKU'] || null,
          package_type: normalizedPackage,
          quantity: quantity,
          amount: parseAmount(row['Item Total'] || row['Amount'] || row['Subtotal'] || 0),
          shipping: parseAmount(row['Shipping'] || row['Shipping Cost'] || 0),
          total: parseAmount(row['Total'] || row['Order Total'] || row['Item Total'] || 0),
          customer_email: row['Email'] || row['Customer Email'] || 'imported@example.com',
          customer_name: row['Customer Name'] || row['Name'] || row['Shipping Name'] || 'Imported Customer',
          customer_country: row['Country'] || row['Customer Country'] || 'US',
          order_date: parseDate(row['Date'] || row['Order Date'] || row['Created']),
          status: 'completed',
          is_upsell: normalizedPackage.includes('Upgrade') ? 1 : 0,
          is_recurring: 0,
          affiliate_id: row['Affiliate ID'] || row['Aff ID'] || null
        };

        // Insert order
        insertOrder.run(orderData);
        imported++;

        if (imported % 100 === 0) {
          console.log(`   Imported ${imported} orders...`);
        }

      } catch (error) {
        errors++;
        console.error(`❌ Error importing row:`, error.message);
      }
    }

    console.log(`✅ Successfully imported ${imported} orders (${errors} errors)`);

    return {
      success: true,
      imported: imported,
      errors: errors,
      file: path.basename(filePath)
    };

  } catch (error) {
    console.error('❌ Error importing Excel:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Command line usage
if (require.main === module) {
  (async () => {
    // Initialize database first
    await initializeDatabase();

    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.log(`
Usage:
  node excel-importer.js <excel-file>

Examples:
  node excel-importer.js "../Sales Record/OrdersReport_01-22-2026_15_11943.xlsx"
      `);
      process.exit(1);
    }

    const filePath = path.resolve(args[0]);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    await importExcelFile(filePath);

    console.log('✅ Import complete!');
    process.exit(0);
  })();
}

module.exports = {
  importExcelFile
};
