require('dotenv').config();
const mongoose = require('mongoose');
const config = require('config');

// Use environment variable or config for MongoDB URI
const mongoURI = process.env.MONGODB_URI || config.get('mongoURI');

console.log(`Using MongoDB URI: ${mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

// Connect to MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log(`Connected to MongoDB at ${mongoose.connection.host}`);
  
  try {
    // Check for shipment legs collection
    const legCollection = mongoose.connection.db.collection('shipmentlegs');
    const legCount = await legCollection.countDocuments();
    console.log(`Found ${legCount} legs in 'shipmentlegs' collection`);
    
    if (legCount > 0) {
      const sampleLegs = await legCollection.find().limit(5).toArray();
      console.log('Sample legs:');
      sampleLegs.forEach(leg => {
        console.log('-------------------');
        console.log(`ID: ${leg._id}`);
        console.log(`From: ${leg.from || leg.origin}`);
        console.log(`To: ${leg.to || leg.destination}`);
        console.log(`Shipment ID: ${leg.shipment || leg.shipmentId}`);
      });
    }
    
    // Check for legs embedded in shipments
    const shipmentCollection = mongoose.connection.db.collection('shipments');
    const shipments = await shipmentCollection.find({legs: {$exists: true}}).toArray();
    console.log(`Found ${shipments.length} shipments with embedded legs array`);
    
    if (shipments.length > 0) {
      shipments.forEach(shipment => {
        console.log('-------------------');
        console.log(`Shipment ID: ${shipment._id}`);
        console.log(`Reference: ${shipment.reference}`);
        console.log(`Has ${shipment.legs ? shipment.legs.length : 0} embedded legs`);
        
        if (shipment.legs && shipment.legs.length > 0) {
          if (typeof shipment.legs[0] === 'object') {
            console.log('Legs are embedded as full objects');
          } else {
            console.log('Legs are embedded as references');
          }
        }
      });
    }
    
    // Exit normally
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
}); 