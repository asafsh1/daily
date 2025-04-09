require('dotenv').config();
const mongoose = require('mongoose');
const config = require('config');
const { ObjectId } = mongoose.Types;

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
    // Get shipments collection
    const shipmentCollection = mongoose.connection.db.collection('shipments');
    const legCollection = mongoose.connection.db.collection('shipmentlegs');
    
    // Find all shipments
    const shipments = await shipmentCollection.find().toArray();
    console.log(`Found ${shipments.length} shipments`);
    
    if (shipments.length === 0) {
      console.log('No shipments found');
      process.exit(0);
    }
    
    // Process each shipment
    for (const shipment of shipments) {
      console.log(`Processing shipment: ${shipment._id} (${shipment.reference || 'No reference'})`);
      
      // Check if shipment already has legs
      let existingLegs = await legCollection.find({ 
        $or: [
          { shipment: shipment._id.toString() },
          { shipmentId: shipment._id.toString() },
          { shipment: shipment._id },
          { shipmentId: shipment._id }
        ]
      }).toArray();
      
      if (existingLegs.length > 0) {
        console.log(`  Shipment already has ${existingLegs.length} legs`);
        continue;
      }
      
      // Create synthetic legs for this shipment
      try {
        const legsToCreate = [];
        
        // Create origin to destination leg
        if (shipment.origin && shipment.destination) {
          console.log(`  Creating leg from ${shipment.origin.name || shipment.origin} to ${shipment.destination.name || shipment.destination}`);
          
          const legData = {
            _id: new ObjectId(),
            shipment: shipment._id,
            shipmentId: shipment._id.toString(),
            from: shipment.origin.name || shipment.origin,
            to: shipment.destination.name || shipment.destination,
            origin: shipment.origin,
            destination: shipment.destination,
            carrier: shipment.carrier || 'Unknown',
            legOrder: 1,
            departureDate: shipment.departureDate || new Date(),
            arrivalDate: shipment.arrivalDate || new Date(),
            status: shipment.status || 'In Transit',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          legsToCreate.push(legData);
        } else {
          console.log('  Missing origin or destination, cannot create leg');
        }
        
        // Insert the legs
        if (legsToCreate.length > 0) {
          const result = await legCollection.insertMany(legsToCreate);
          console.log(`  Created ${result.insertedCount} legs`);
          
          // Update the shipment with leg references
          const legIds = legsToCreate.map(leg => leg._id);
          await shipmentCollection.updateOne(
            { _id: shipment._id },
            { $set: { legs: legIds } }
          );
          console.log(`  Updated shipment with ${legIds.length} leg references`);
        }
      } catch (legError) {
        console.error(`  Error creating legs for shipment ${shipment._id}:`, legError);
      }
    }
    
    console.log('Finished processing all shipments');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
}); 