const fs = require('fs');
const path = require('path');
const { initializeDatabase, insertOrder } = require('./database-sqljs');

// Helper function to parse CSV with proper quoted field handling
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());

  // Parse headers
  const headers = parseCSVLine(lines[0]);

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    data.push(row);
  }

  return data;
}

// Parse a single CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Push last field
  result.push(current.trim());

  return result;
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

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    rows.forEach((row, index) => {
      try {
        // Skip test orders
        if (row['Is Test'] === '1') {
          skipped++;
          return;
        }

        // Parse product names from "Product Names" field
        const productNames = row['Product Names'] || '';
        const { quantity, normalizedPackage } = parsePackageFromCSV(productNames, productNames);

        // Parse amounts - remove $ and convert to float
        const parseAmount = (val) => {
          if (!val) return 0;
          return parseFloat(val.toString().replace(/[$,]/g, '')) || 0;
        };

        // Parse date from "Date Created" field (format: "2026-01-08 08:05:15")
        const orderDate = row['Date Created'] || new Date().toISOString();

        const orderData = {
          order_id: row['Order ID'] || `IMP-${Date.now()}-${index}`,
          product_name: extractProductName(productNames),
          product_id: row['SKU'] || null,
          package_type: normalizedPackage,
          quantity: quantity,
          amount: parseAmount(row['Vendor Net']) || parseAmount(row['Total collected (Transaction Amount)']),
          shipping: parseAmount(row['Average Shipping Cost']) || 0,
          total: parseAmount(row['Total collected (Transaction Amount)']),
          customer_email: row['Customer Email Address'] || 'imported@example.com',
          customer_name: row['Customer Name'] || 'Imported Customer',
          customer_country: row['Country'] || 'US',
          order_date: orderDate,
          status: row['Status'] === 'Completed' ? 'completed' : 'completed',
          is_upsell: parseInt(row['Flag Upsell']) === 1 ? 1 : 0,
          is_recurring: 0,
          affiliate_id: row['Affiliate ID'] || null
        };

        // Insert order using sql.js pattern
        insertOrder.run(orderData);
        imported++;

        if (imported % 50 === 0) {
          console.log(`   Imported ${imported} orders...`);
        }

      } catch (error) {
        errors++;
        console.error(`❌ Error importing row ${index}:`, error.message);
      }
    });

    console.log(`
╔════════════════════════════════════════════╗
║   ✅ CSV Import Complete                  ║
║                                            ║
║   Total Rows: ${rows.length.toString().padEnd(30)}║
║   Imported: ${imported.toString().padEnd(32)}║
║   Skipped (Test): ${skipped.toString().padEnd(26)}║
║   Errors: ${errors.toString().padEnd(34)}║
║                                            ║
╚════════════════════════════════════════════╝
    `);

    return {
      success: true,
      imported: imported,
      skipped: skipped,
      errors: errors,
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
  (async () => {
    // Initialize database first
    await initializeDatabase();

    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.log(`
Usage:
  node csv-importer.js <file-or-directory>

Examples:
  node csv-importer.js "../Sales Record/OrdersReport_01-22-2026_19_11943.csv"
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

    console.log('\n✅ Import complete! You can now view the data in Analytics tab.');
    process.exit(0);
  })();
}

module.exports = {
  importBuygoodsCSV,
  importAllCSVs
};
