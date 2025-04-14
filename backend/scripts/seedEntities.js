const mongoose = require('mongoose');
const config = require('config');
const Shipper = require('../models/Shipper');
const Consignee = require('../models/Consignee');
const NotifyParty = require('../models/NotifyParty');

// Connect to MongoDB with fallback
const connectDB = async () => {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 3000; // 3 seconds

  let mongoURI;
  try {
    mongoURI = config.get('mongoURI');
    console.log('Using MongoDB URI from config file');
  } catch (err) {
    console.error('Error loading MongoDB URI from config:', err.message);
    mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('MONGODB_URI environment variable is not set');
      process.exit(1);
    }
    console.log('Using MongoDB URI from environment variable');
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`MongoDB connection attempt ${attempt} of ${MAX_RETRIES}...`);
      
      // Hide password in logs
      const sanitizedURI = mongoURI.replace(/\/\/([^:]+):[^@]+@/, '//***:***@');
      console.log(`Connecting to: ${sanitizedURI}`);
      
      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
      });
      
      console.log(`MongoDB Connected to ${mongoose.connection.host}`);
      return true;
    } catch (err) {
      console.error(`Connection attempt ${attempt} failed:`, err.message);
      
      // If this is not the last attempt, wait before retrying
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        console.error('Database seeding failed due to connection issues.');
        process.exit(1);
      }
    }
  }
  
  return false;
};

// Sample data
const shippers = [
  {
    name: 'Global Shipping Inc.',
    shipperId: 'SHP-1001',
    address: '123 Export St, New York, NY 10001',
    contact: 'John Smith',
    email: 'jsmith@globalshipping.com',
    phone: '212-555-1234'
  },
  {
    name: 'Fast Freight Solutions',
    shipperId: 'SHP-1002',
    address: '456 Logistics Ave, Los Angeles, CA 90012',
    contact: 'Maria Garcia',
    email: 'mgarcia@fastfreight.com',
    phone: '323-555-6789'
  },
  {
    name: 'Pacific Logistics',
    shipperId: 'SHP-1003',
    address: '789 Harbor Blvd, Seattle, WA 98101',
    contact: 'David Chen',
    email: 'dchen@paclog.com',
    phone: '206-555-9876'
  },
  {
    name: 'Trans-Atlantic Exports',
    shipperId: 'SHP-1004',
    address: '101 Ocean Way, Miami, FL 33131',
    contact: 'Sarah Johnson',
    email: 'sjohnson@transatlantic.com',
    phone: '305-555-4321'
  },
  {
    name: 'Eagle Shipping Co.',
    shipperId: 'SHP-1005',
    address: '202 Cargo Lane, Houston, TX 77002',
    contact: 'Michael Wilson',
    email: 'mwilson@eagleship.com',
    phone: '713-555-8765'
  }
];

const consignees = [
  {
    name: 'European Imports Ltd',
    consigneeId: 'CON-2001',
    address: '15 Thames Street, London, UK E14 9YT',
    contact: 'Emma Clarke',
    email: 'eclarke@euroimports.co.uk',
    phone: '+44-20-5555-1212'
  },
  {
    name: 'Asian Market Solutions',
    consigneeId: 'CON-2002',
    address: '25 Harbor Road, Singapore 118405',
    contact: 'Li Wei',
    email: 'lwei@asianmarket.sg',
    phone: '+65-6555-8989'
  },
  {
    name: 'South American Distributors',
    consigneeId: 'CON-2003',
    address: '789 Avenida Paulista, São Paulo, Brazil 01310-100',
    contact: 'Carlos Mendez',
    email: 'cmendez@sadistributors.br',
    phone: '+55-11-5555-7878'
  },
  {
    name: 'Australian Retail Group',
    consigneeId: 'CON-2004',
    address: '45 Harbour Street, Sydney, Australia 2000',
    contact: 'Jason Hughes',
    email: 'jhughes@ausretail.com.au',
    phone: '+61-2-5555-3434'
  },
  {
    name: 'Middle East Trading Co.',
    consigneeId: 'CON-2005',
    address: '100 Sheikh Zayed Road, Dubai, UAE',
    contact: 'Amina Khalid',
    email: 'akhalid@metradingco.ae',
    phone: '+971-4-555-6767'
  }
];

const notifyParties = [
  {
    name: 'Global Insurance Group',
    notifyPartyId: 'NP-3001',
    address: '100 Financial Ave, New York, NY 10005',
    contact: 'Robert Thompson',
    email: 'rthompson@globalinsurance.com',
    phone: '212-555-2020'
  },
  {
    name: 'Customs Clearance Services',
    notifyPartyId: 'NP-3002',
    address: '50 Border Road, El Paso, TX 79901',
    contact: 'Anna Martinez',
    email: 'amartinez@customsclearance.com',
    phone: '915-555-3030'
  },
  {
    name: 'International Logistics Partners',
    notifyPartyId: 'NP-3003',
    address: '75 Supply Chain Drive, Chicago, IL 60607',
    contact: 'James Wilson',
    email: 'jwilson@intllogistics.com',
    phone: '312-555-4040'
  },
  {
    name: 'Maritime Security Agency',
    notifyPartyId: 'NP-3004',
    address: '200 Navy Pier, San Diego, CA 92101',
    contact: 'Patricia Kim',
    email: 'pkim@maritimsecurity.com',
    phone: '619-555-5050'
  },
  {
    name: 'Cargo Inspection Bureau',
    notifyPartyId: 'NP-3005',
    address: '150 Port Authority Road, Newark, NJ 07114',
    contact: 'Daniel Brown',
    email: 'dbrown@cargoinspect.com',
    phone: '973-555-6060'
  }
];

// Seed database
const seedDatabase = async () => {
  try {
    await connectDB();

    // Check if there's existing data before clearing
    const shipperCount = await Shipper.countDocuments();
    const consigneeCount = await Consignee.countDocuments();
    const notifyPartyCount = await NotifyParty.countDocuments();
    
    console.log('Existing data:');
    console.log(`- Shippers: ${shipperCount}`);
    console.log(`- Consignees: ${consigneeCount}`);
    console.log(`- Notify Parties: ${notifyPartyCount}`);
    
    // Clear existing data
    console.log('Clearing existing data...');
    await Shipper.deleteMany({});
    await Consignee.deleteMany({});
    await NotifyParty.deleteMany({});

    // Insert new data
    console.log('Inserting sample shippers...');
    await Shipper.insertMany(shippers);
    console.log('Sample shippers added!');

    console.log('Inserting sample consignees...');
    await Consignee.insertMany(consignees);
    console.log('Sample consignees added!');

    console.log('Inserting sample notify parties...');
    await NotifyParty.insertMany(notifyParties);
    console.log('Sample notify parties added!');

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err.message);
    process.exit(1);
  }
};

seedDatabase(); 