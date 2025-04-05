const mongoose = require('mongoose');
const config = require('config');
const { generateUniqueId } = require('../../frontend/src/utils/idGenerator');

// Connect to MongoDB
const db = config.get('mongoURI');

// Import models
const Shipper = require('../models/Shipper');
const Consignee = require('../models/Consignee');
const NotifyParty = require('../models/NotifyParty');

// Sample data for shippers
const shippers = [
  {
    name: 'Global Shipping Co.',
    email: 'contact@globalshipping.com',
    phone: '+1-555-123-4567',
    address: '123 Harbor Drive, Port City, CA 90210, USA',
    contactPerson: 'James Wilson',
    notes: 'Premium shipping partner with global reach',
    shipperId: 'SHP-' + Math.random().toString(36).substring(2, 10)
  },
  {
    name: 'FastFreight Logistics',
    email: 'operations@fastfreight.com',
    phone: '+1-555-987-6543',
    address: '456 Industrial Parkway, Logistics City, TX 75001, USA',
    contactPerson: 'Sarah Johnson',
    notes: 'Specializes in expedited shipping services',
    shipperId: 'SHP-' + Math.random().toString(36).substring(2, 10)
  },
  {
    name: 'SeaWay Transport',
    email: 'info@seawaytransport.com',
    phone: '+1-555-789-0123',
    address: '789 Ocean Boulevard, Marina Bay, FL 33019, USA',
    contactPerson: 'Robert Chen',
    notes: 'Specialized in sea freight and container shipping',
    shipperId: 'SHP-' + Math.random().toString(36).substring(2, 10)
  },
  {
    name: 'AirSpeed Cargo',
    email: 'booking@airspeedcargo.com',
    phone: '+1-555-234-5678',
    address: '101 Airport Road, Flight City, NY 10001, USA',
    contactPerson: 'Emily Rodriguez',
    notes: 'Air freight specialists with express delivery options',
    shipperId: 'SHP-' + Math.random().toString(36).substring(2, 10)
  },
  {
    name: 'Continental Shippers',
    email: 'service@continentalshippers.com',
    phone: '+1-555-345-6789',
    address: '222 Freight Lane, Transport Hub, IL 60007, USA',
    contactPerson: 'David Smith',
    notes: 'Full-service shipping provider for all logistics needs',
    shipperId: 'SHP-' + Math.random().toString(36).substring(2, 10)
  }
];

// Sample data for consignees
const consignees = [
  {
    name: 'TechGlobal Imports',
    email: 'receiving@techglobal.com',
    phone: '+1-555-111-2222',
    address: '100 Silicon Avenue, Tech Valley, CA 94085, USA',
    contactPerson: 'Michael Lee',
    notes: 'Major electronics distributor, requires prior delivery notification',
    consigneeId: 'CNS-' + Math.random().toString(36).substring(2, 10)
  },
  {
    name: 'EuroDistribution Center',
    email: 'logistics@eurodistribution.eu',
    phone: '+44-20-1234-5678',
    address: '15 Commerce Road, Manchester, M15 6JX, United Kingdom',
    contactPerson: 'Sophia Mueller',
    notes: 'European distribution hub with customs clearance services',
    consigneeId: 'CNS-' + Math.random().toString(36).substring(2, 10)
  },
  {
    name: 'Pacific Wholesale Market',
    email: 'imports@pacificwholesale.com',
    phone: '+61-2-9876-5432',
    address: '78 Harbor Road, Sydney, NSW 2000, Australia',
    contactPerson: 'Daniel Wong',
    notes: 'Major importer serving Asia-Pacific regions',
    consigneeId: 'CNS-' + Math.random().toString(36).substring(2, 10)
  },
  {
    name: 'American Retail Chain',
    email: 'supply@americanretail.com',
    phone: '+1-555-444-3333',
    address: '500 Commerce Drive, Retail Park, OH 43026, USA',
    contactPerson: 'Jessica Taylor',
    notes: 'National retail chain with multiple distribution centers',
    consigneeId: 'CNS-' + Math.random().toString(36).substring(2, 10)
  },
  {
    name: 'Global Manufacturing Inc.',
    email: 'procurement@globalmanufacturing.com',
    phone: '+1-555-777-8888',
    address: '1250 Industrial Boulevard, Factory Town, MI 48127, USA',
    contactPerson: 'Thomas Clark',
    notes: 'Just-in-time manufacturing requires precise delivery schedules',
    consigneeId: 'CNS-' + Math.random().toString(36).substring(2, 10)
  }
];

// Sample data for notify parties
const notifyParties = [
  {
    name: 'ClearView Customs Brokers',
    email: 'notifications@clearviewcustoms.com',
    phone: '+1-555-222-3333',
    address: '75 Border Lane, Entry Point, TX 78852, USA',
    contactPerson: 'Anna Martinez',
    notes: 'Customs clearance specialist, requires all shipping documents 48h in advance',
    notifyPartyId: 'NP-' + Math.random().toString(36).substring(2, 10)
  },
  {
    name: 'SafeHarbor Insurance Group',
    email: 'cargo@safeharbor.com',
    phone: '+1-555-666-7777',
    address: '300 Underwriter Plaza, Insurance City, CT 06103, USA',
    contactPerson: 'Paul Johnson',
    notes: 'Insurance provider for high-value shipments',
    notifyPartyId: 'NP-' + Math.random().toString(36).substring(2, 10)
  },
  {
    name: 'QuickTrack Logistics',
    email: 'tracking@quicktrack.com',
    phone: '+1-555-888-9999',
    address: '450 Monitoring Street, Dispatch City, GA 30328, USA',
    contactPerson: 'Lisa Williams',
    notes: 'Third-party logistics provider that manages final mile delivery',
    notifyPartyId: 'NP-' + Math.random().toString(36).substring(2, 10)
  },
  {
    name: 'International Trade Compliance',
    email: 'compliance@itcglobal.com',
    phone: '+1-555-111-0000',
    address: '88 Regulation Avenue, Washington, DC 20001, USA',
    contactPerson: 'Mark Stevens',
    notes: 'Handles trade compliance documentation and regulatory filings',
    notifyPartyId: 'NP-' + Math.random().toString(36).substring(2, 10)
  },
  {
    name: 'Global Finance Partners',
    email: 'trade@globalfinance.com',
    phone: '+1-555-999-1111',
    address: '1 Financial Plaza, Banking District, NY 10005, USA',
    contactPerson: 'Olivia Parker',
    notes: 'Handles letters of credit and international payment processing',
    notifyPartyId: 'NP-' + Math.random().toString(36).substring(2, 10)
  }
];

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(db);
    console.log('MongoDB Connected...');
    
    // Clear existing data
    await Shipper.deleteMany({});
    await Consignee.deleteMany({});
    await NotifyParty.deleteMany({});
    
    console.log('Existing data cleared');
    
    // Insert sample data
    await Shipper.insertMany(shippers);
    await Consignee.insertMany(consignees);
    await NotifyParty.insertMany(notifyParties);
    
    console.log('Sample data inserted successfully');
    
    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('MongoDB Disconnected');
    
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

// Run the seeding function
connectDB(); 