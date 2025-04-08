require('dotenv').config();
const mongoose = require('mongoose');
const config = require('config');
const { ObjectId } = mongoose.Types;

// Force using MongoDB Atlas
process.env.MONGODB_URI = "mongodb+srv://asafasaf5347:asafasaf5347@cluster0.lyz67.mongodb.net/shipment-tracker?retryWrites=true&w=majority&appName=Cluster0";

// Use environment variable for MongoDB URI
const mongoURI = process.env.MONGODB_URI;

console.log(`Using MongoDB URI: ${mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

// Generate sequential IDs
const generateSequentialId = (prefix, num) => {
  return `${prefix}${num.toString().padStart(3, '0')}`;
};

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
    
    // Get the current count of shipments to determine next sequential number
    const shipmentCount = await shipmentCollection.countDocuments();
    const startingShipmentNum = shipmentCount + 1;
    
    // Get the current count of legs to determine next sequential number
    const legCount = await legCollection.countDocuments();
    const startingLegNum = legCount + 1;
    
    let currentShipmentNum = startingShipmentNum;
    let currentLegNum = startingLegNum;
    
    // Sample shipment data
    const shipments = [
      {
        _id: new ObjectId(),
        reference: generateSequentialId("SHIPMENT", currentShipmentNum++),
        serialNumber: generateSequentialId("SHIPMENT", startingShipmentNum),
        origin: {
          name: "Shanghai, China",
          code: "PVG"
        },
        destination: {
          name: "Los Angeles, CA",
          code: "LAX"
        },
        carrier: "Ocean Star Shipping",
        departureDate: new Date("2023-10-15"),
        arrivalDate: new Date("2023-11-05"),
        status: "Completed",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        reference: generateSequentialId("SHIPMENT", currentShipmentNum++),
        serialNumber: generateSequentialId("SHIPMENT", startingShipmentNum + 1),
        origin: {
          name: "London, UK",
          code: "LHR"
        },
        destination: {
          name: "New York, NY",
          code: "JFK"
        },
        carrier: "Global Air Express",
        departureDate: new Date("2023-12-10"),
        arrivalDate: new Date("2023-12-11"),
        status: "In Transit",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    console.log("Creating sample shipments...");
    
    // Insert shipments
    for (const shipment of shipments) {
      // Check if shipment with this reference already exists
      const existingShipment = await shipmentCollection.findOne({ reference: shipment.reference });
      
      if (existingShipment) {
        console.log(`Shipment with reference ${shipment.reference} already exists, skipping.`);
        continue;
      }
      
      // Insert the shipment
      await shipmentCollection.insertOne(shipment);
      console.log(`Created shipment with ID: ${shipment._id} and reference ${shipment.reference}`);
      
      // Create legs for this shipment
      if (shipment.reference === generateSequentialId("SHIPMENT", startingShipmentNum)) {
        // Create 2 legs for the first shipment
        const legs = [
          {
            _id: new ObjectId(),
            legId: generateSequentialId("LEG", currentLegNum++),
            shipment: shipment._id,
            shipmentId: shipment._id.toString(),
            from: "Shanghai, China",
            to: "Singapore",
            origin: {
              name: "Shanghai, China",
              code: "PVG"
            },
            destination: {
              name: "Singapore",
              code: "SIN"
            },
            carrier: "Ocean Star Shipping",
            legOrder: 1,
            departureDate: new Date("2023-10-15"),
            arrivalDate: new Date("2023-10-25"),
            status: "Completed",
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            _id: new ObjectId(),
            legId: generateSequentialId("LEG", currentLegNum++),
            shipment: shipment._id,
            shipmentId: shipment._id.toString(),
            from: "Singapore",
            to: "Los Angeles, CA",
            origin: {
              name: "Singapore",
              code: "SIN"
            },
            destination: {
              name: "Los Angeles, CA",
              code: "LAX"
            },
            carrier: "Ocean Star Shipping",
            legOrder: 2,
            departureDate: new Date("2023-10-26"),
            arrivalDate: new Date("2023-11-05"),
            status: "Completed",
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
        
        // Insert legs
        await legCollection.insertMany(legs);
        console.log(`Created ${legs.length} legs for shipment ${shipment.reference}`);
        
        // Update shipment with leg references
        const legIds = legs.map(leg => leg._id);
        await shipmentCollection.updateOne(
          { _id: shipment._id },
          { $set: { legs: legIds } }
        );
        console.log(`Updated shipment with ${legIds.length} leg references`);
      } else if (shipment.reference === generateSequentialId("SHIPMENT", startingShipmentNum + 1)) {
        // Create 3 legs for the second shipment
        const legs = [
          {
            _id: new ObjectId(),
            legId: generateSequentialId("LEG", currentLegNum++),
            shipment: shipment._id,
            shipmentId: shipment._id.toString(),
            from: "London, UK",
            to: "Frankfurt, Germany",
            origin: {
              name: "London, UK",
              code: "LHR"
            },
            destination: {
              name: "Frankfurt, Germany",
              code: "FRA"
            },
            carrier: "European Air",
            legOrder: 1,
            departureDate: new Date("2023-12-10T08:00:00Z"),
            arrivalDate: new Date("2023-12-10T10:30:00Z"),
            status: "Completed",
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            _id: new ObjectId(),
            legId: generateSequentialId("LEG", currentLegNum++),
            shipment: shipment._id,
            shipmentId: shipment._id.toString(),
            from: "Frankfurt, Germany",
            to: "Toronto, Canada",
            origin: {
              name: "Frankfurt, Germany",
              code: "FRA"
            },
            destination: {
              name: "Toronto, Canada",
              code: "YYZ"
            },
            carrier: "Global Air Express",
            legOrder: 2,
            departureDate: new Date("2023-12-10T12:00:00Z"),
            arrivalDate: new Date("2023-12-10T18:30:00Z"),
            status: "Completed",
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            _id: new ObjectId(),
            legId: generateSequentialId("LEG", currentLegNum++),
            shipment: shipment._id,
            shipmentId: shipment._id.toString(),
            from: "Toronto, Canada",
            to: "New York, NY",
            origin: {
              name: "Toronto, Canada",
              code: "YYZ"
            },
            destination: {
              name: "New York, NY",
              code: "JFK"
            },
            carrier: "North American Airways",
            legOrder: 3,
            departureDate: new Date("2023-12-11T08:00:00Z"),
            arrivalDate: new Date("2023-12-11T09:30:00Z"),
            status: "In Transit",
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
        
        // Insert legs
        await legCollection.insertMany(legs);
        console.log(`Created ${legs.length} legs for shipment ${shipment.reference}`);
        
        // Update shipment with leg references
        const legIds = legs.map(leg => leg._id);
        await shipmentCollection.updateOne(
          { _id: shipment._id },
          { $set: { legs: legIds } }
        );
        console.log(`Updated shipment with ${legIds.length} leg references`);
      }
    }
    
    console.log('Finished creating sample shipments and legs');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
}); 