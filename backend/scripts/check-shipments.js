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
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Available collections:");
    collections.forEach(collection => console.log(`- ${collection.name}`));
    
    // Check if we have a shipments collection
    let shipmentCollectionExists = collections.some(c => c.name === 'shipments');
    console.log(`Shipments collection exists: ${shipmentCollectionExists}`);
    
    if (shipmentCollectionExists) {
      // Count documents in the shipments collection
      const shipmentCount = await mongoose.connection.db.collection('shipments').countDocuments();
      console.log(`Found ${shipmentCount} shipments`);
      
      if (shipmentCount > 0) {
        // Get a sample of shipments
        const shipments = await mongoose.connection.db.collection('shipments').find().limit(5).toArray();
        console.log("Sample shipments:");
        shipments.forEach(shipment => {
          console.log("------------------");
          console.log(`ID: ${shipment._id}`);
          console.log(`Reference: ${shipment.reference || 'N/A'}`);
          console.log(`Origin: ${shipment.origin ? JSON.stringify(shipment.origin) : 'N/A'}`);
          console.log(`Destination: ${shipment.destination ? JSON.stringify(shipment.destination) : 'N/A'}`);
          console.log(`Has legs array: ${shipment.legs ? 'Yes' : 'No'}`);
          if (shipment.legs) {
            console.log(`Legs count: ${shipment.legs.length}`);
          }
        });
      }
    }
    
    // Create a test shipment if there are none
    if (!shipmentCollectionExists || await mongoose.connection.db.collection('shipments').countDocuments() === 0) {
      console.log("Creating a test shipment...");
      
      const testShipment = {
        reference: "TEST-" + Date.now(),
        origin: {
          name: "Los Angeles, CA",
          code: "LAX"
        },
        destination: {
          name: "New York, NY",
          code: "JFK"
        },
        carrier: "Test Carrier",
        departureDate: new Date(),
        arrivalDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days later
        status: "In Transit",
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await mongoose.connection.db.collection('shipments').insertOne(testShipment);
      console.log(`Created test shipment with ID: ${result.insertedId}`);
      
      // Now create a leg for this shipment
      const testLeg = {
        shipment: result.insertedId.toString(),
        shipmentId: result.insertedId,
        from: "Los Angeles, CA",
        to: "New York, NY",
        origin: {
          name: "Los Angeles, CA",
          code: "LAX"
        },
        destination: {
          name: "New York, NY",
          code: "JFK"
        },
        carrier: "Test Carrier",
        legOrder: 1,
        departureDate: new Date(),
        arrivalDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: "In Transit",
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Create shipment legs collection if it doesn't exist
      const legResult = await mongoose.connection.db.collection('shipmentlegs').insertOne(testLeg);
      console.log(`Created test leg with ID: ${legResult.insertedId}`);
      
      // Update the shipment with the leg reference
      await mongoose.connection.db.collection('shipments').updateOne(
        { _id: result.insertedId },
        { $set: { legs: [legResult.insertedId] } }
      );
      console.log(`Updated shipment with leg reference`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
}); 