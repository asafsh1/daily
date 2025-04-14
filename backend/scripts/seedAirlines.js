const mongoose = require('mongoose');
const Airline = require('../models/Airline');
require('dotenv').config();

const initialAirlines = [
  {
    name: 'El Al Israel Airlines',
    code: '114',
    trackingUrlTemplate: 'https://www.elal.com/en/cargo/tracking?awb={awb}',
    status: 'active'
  },
  {
    name: 'Turkish Airlines',
    code: '235',
    trackingUrlTemplate: 'https://www.turkishcargo.com.tr/en/tracking?awb={awb}',
    status: 'active'
  },
  {
    name: 'Lufthansa Cargo',
    code: '220',
    trackingUrlTemplate: 'https://www.lufthansa-cargo.com/en/tracking?awb={awb}',
    status: 'active'
  },
  {
    name: 'Emirates SkyCargo',
    code: '176',
    trackingUrlTemplate: 'https://www.emirates.com/cargo/tracking?awb={awb}',
    status: 'active'
  },
  {
    name: 'Qatar Airways Cargo',
    code: '157',
    trackingUrlTemplate: 'https://www.qrcargo.com/tracking?awb={awb}',
    status: 'active'
  },
  {
    name: 'Ethiopian Airlines Cargo',
    code: '071',
    trackingUrlTemplate: 'https://www.ethiopianairlines.com/cargo/tracking?awb={awb}',
    status: 'active'
  },
  {
    name: 'Air France Cargo',
    code: '057',
    trackingUrlTemplate: 'https://www.airfrancecargo.com/tracking?awb={awb}',
    status: 'active'
  },
  {
    name: 'KLM Cargo',
    code: '074',
    trackingUrlTemplate: 'https://www.klmcargo.com/tracking?awb={awb}',
    status: 'active'
  },
  {
    name: 'British Airways World Cargo',
    code: '125',
    trackingUrlTemplate: 'https://www.baworldcargo.com/tracking?awb={awb}',
    status: 'active'
  },
  {
    name: 'Cathay Pacific Cargo',
    code: '160',
    trackingUrlTemplate: 'https://www.cathaypacificcargo.com/tracking?awb={awb}',
    status: 'active'
  }
];

const seedAirlines = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI environment variable is not set');
      process.exit(1);
    }
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Clear existing airlines
    await Airline.deleteMany({});
    console.log('Cleared existing airlines');

    // Insert initial airlines
    const airlines = await Airline.insertMany(initialAirlines);
    console.log(`Successfully seeded ${airlines.length} airlines`);

    // Verify the data
    const count = await Airline.countDocuments();
    console.log(`Total airlines in database: ${count}`);

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding airlines:', error);
    process.exit(1);
  }
};

// Run the seed function
seedAirlines(); 