const xlsx = require('xlsx');
const mongoose = require('mongoose');
const config = require('config');
const Shipment = require('../models/Shipment');

// Connect to MongoDB
mongoose.connect(config.get('mongoURI'), {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Function to parse Excel date (Excel dates are days since 1/1/1900)
const parseExcelDate = (excelDate) => {
  if (!excelDate) return null;
  
  // Excel's epoch starts on 1/1/1900
  const epoch = new Date(1900, 0, 1);
  
  // Excel has a leap year bug where it thinks 1900 was a leap year
  // So if the date is after 2/28/1900, we need to subtract a day
  const days = excelDate - (excelDate > 59 ? 1 : 0);
  
  // Add days to the epoch
  const date = new Date(epoch);
  date.setDate(date.getDate() + days - 1); // -1 because Excel counts from 1/1/1900 as day 1
  
  return date;
};

// Function to convert Excel boolean values
const parseExcelBoolean = (value) => {
  if (value === 'yes' || value === 'YES' || value === true) {
    return true;
  }
  return false;
};

// Function to import data from Excel
const importExcel = async (filePath) => {
  try {
    console.log('Reading Excel file...');
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} records to import`);

    // Clear existing data (optional)
    // await Shipment.deleteMany({});

    // Map Excel columns to MongoDB schema
    const shipments = data.map(row => ({
      dateAdded: parseExcelDate(row['Date added']),
      orderStatus: row['Order status']?.toLowerCase() || 'pending',
      customer: row['Customer'] || '',
      awbNumber1: row['AWB #1'] ? row['AWB #1'].toString() : '',
      awbNumber2: row['AWB #2'] ? row['AWB #2'].toString() : '',
      routing: row['Routing'] || '',
      scheduledArrival: parseExcelDate(row['Scheduled Arrival']),
      shipmentStatus: row['Shipment Status'] || 'Pending',
      fileNumber: row['File Number'] ? row['File Number'].toString() : '',
      fileCreatedDate: parseExcelDate(row['File Created Date']),
      invoiced: row['Invoiced'] === 'Yes',
      invoiceSent: row['Invoice Sent'] === 'Yes',
      cost: parseFloat(row['Cost']) || 0,
      receivables: row['Receivables'] || '',
      comments: row['Comments'] || '',
      invoiceNumber: row['Invoice no'] ? row['Invoice no'].toString() : '',
      invoiceStatus: row['Invoice status'] || ''
    }));

    // Insert data into MongoDB
    console.log('Importing data to MongoDB...');
    await Shipment.insertMany(shipments);

    console.log('Import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
};

// Check if file path is provided
if (process.argv.length < 3) {
  console.log('Usage: node import-excel.js <excel-file-path>');
  process.exit(1);
}

// Run the import
const filePath = process.argv[2];
importExcel(filePath); 