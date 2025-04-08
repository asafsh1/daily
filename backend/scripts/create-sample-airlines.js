const mongoose = require('mongoose');
const config = require('config');
const Airline = require('../models/Airline');

// Standard airlines to add to the system
const sampleAirlines = [
  {
    name: 'El Al',
    code: '114',
    trackingUrlTemplate: 'https://www.elalextra.net/info/awb.asp?aid=114&awb={awb}',
    status: 'active'
  },
  {
    name: 'Emirates',
    code: '176',
    trackingUrlTemplate: 'https://eskycargo.emirates.com/app/offerandorder/#/shipments/list?type=D&values={awb}',
    status: 'active'
  },
  {
    name: 'Qatar Airways',
    code: '157',
    trackingUrlTemplate: 'https://www.qrcargo.com/s/track-your-shipment?documentType=MAWB&documentPrefix=157&documentNumber={awb}',
    status: 'active'
  },
  {
    name: 'Delta',
    code: '006',
    trackingUrlTemplate: 'https://www.deltacargo.com/Cargo/home/trackShipment?awbNumber={awb}',
    status: 'active'
  },
  {
    name: 'American Airlines',
    code: '001',
    trackingUrlTemplate: 'https://www.aacargo.com/mobile/tracking-details.html?awb={awb}',
    status: 'active'
  },
  {
    name: 'Lufthansa',
    code: '020',
    trackingUrlTemplate: 'https://www.lufthansa-cargo.com/track/{awb}',
    status: 'active'
  },
  {
    name: 'KLM',
    code: '074',
    trackingUrlTemplate: 'https://www.afklcargo.com/track/public/shipment?awbPrefix=074&awbNumber={awb}',
    status: 'active'
  },
  {
    name: 'Turkish Airlines',
    code: '235',
    trackingUrlTemplate: 'https://www.turkishcargo.com.tr/en/cargo-track?awbNo={awb}',
    status: 'active'
  }
];

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    
    // Get the connection string from config
    const mongoURI = process.env.MONGODB_URI || config.get('mongoURI');
    
    if (!mongoURI) {
      console.error('MongoDB URI is not defined in environment variables or config');
      process.exit(1);
    }
    
    // Connect to MongoDB Atlas
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

// Add airlines to database
const createSampleAirlines = async () => {
  try {
    await connectDB();
    
    console.log('Checking existing airlines...');
    const existingAirlines = await Airline.find();
    
    if (existingAirlines.length > 0) {
      console.log(`Found ${existingAirlines.length} airlines already in database.`);
      console.log('Codes:', existingAirlines.map(a => a.code).join(', '));
    }
    
    // Filter out airlines that already exist
    const existingCodes = existingAirlines.map(airline => airline.code);
    const airlinesNotInDb = sampleAirlines.filter(airline => !existingCodes.includes(airline.code));
    
    if (airlinesNotInDb.length === 0) {
      console.log('All sample airlines already in database. No new airlines to add.');
      process.exit(0);
    }
    
    console.log(`Adding ${airlinesNotInDb.length} airlines to database...`);
    
    // Add the airlines
    const result = await Airline.insertMany(airlinesNotInDb, { ordered: false });
    
    console.log(`✅ Successfully added ${result.length} airlines to the database.`);
    console.log('New airline codes:', result.map(a => a.code).join(', '));
    
    process.exit(0);
  } catch (err) {
    console.error('Error creating sample airlines:', err.message);
    
    if (err.code === 11000) {
      console.log('Some airlines already exist in the database. Others may have been added.');
    }
    
    process.exit(1);
  }
};

// Run the function
createSampleAirlines(); 