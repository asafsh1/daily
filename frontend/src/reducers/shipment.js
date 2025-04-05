import {
  GET_SHIPMENTS,
  GET_SHIPMENT,
  ADD_SHIPMENT,
  UPDATE_SHIPMENT,
  DELETE_SHIPMENT,
  CLEAR_SHIPMENT,
  SHIPMENT_ERROR,
  SHIPMENT_LOADING,
  SHIPMENTS_LOADING
} from '../actions/types';

const initialState = {
  shipments: [],
  shipment: null,
  loading: false,
  shipmentsLoading: false,
  error: {}
};

// Helper function to validate shipment object
const validateShipment = (shipment) => {
  if (!shipment || typeof shipment !== 'object') {
    console.error('Invalid shipment:', shipment);
    return null;
  }
  
  // Ensure shipment has an ID
  if (!shipment._id) {
    console.error('Shipment missing _id:', shipment);
    return null;
  }
  
  // Ensure required properties exist with fallbacks
  return {
    ...shipment,
    legs: Array.isArray(shipment.legs) ? shipment.legs : [],
    status: shipment.status || 'Pending',
    dateAdded: shipment.dateAdded || new Date(),
    // Add other essential properties with fallbacks
    origin: shipment.origin || '',
    destination: shipment.destination || '',
    mode: shipment.mode || 'Air'
  };
};

export default function(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case SHIPMENT_LOADING:
      return {
        ...state,
        loading: true
      };
    case SHIPMENTS_LOADING:
      return {
        ...state,
        shipmentsLoading: true
      };
    case GET_SHIPMENTS:
      console.log('Reducer: GET_SHIPMENTS with payload:', payload);
      // Ensure payload is an array and filter out invalid items
      const validShipments = Array.isArray(payload) 
        ? payload
            .filter(shipment => shipment && typeof shipment === 'object')
            .map(shipment => validateShipment(shipment))
            .filter(Boolean) // Filter out null values
        : [];
        
      console.log(`Reducer: Validated ${validShipments.length} shipments out of ${Array.isArray(payload) ? payload.length : 0}`);
      
      return {
        ...state,
        shipments: validShipments,
        loading: false,
        shipmentsLoading: false
      };
    case GET_SHIPMENT:
      // Validate single shipment
      const validShipment = validateShipment(payload);
      return {
        ...state,
        shipment: validShipment,
        loading: false
      };
    case ADD_SHIPMENT:
      // Validate new shipment before adding
      const newShipment = validateShipment(payload);
      if (!newShipment) {
        return {
          ...state,
          loading: false
        };
      }
      return {
        ...state,
        shipments: [newShipment, ...state.shipments],
        loading: false
      };
    case UPDATE_SHIPMENT:
      // Validate updated shipment
      const updatedShipment = validateShipment(payload);
      if (!updatedShipment) {
        return {
          ...state,
          loading: false
        };
      }
      return {
        ...state,
        shipments: state.shipments.map(shipment =>
          shipment._id === updatedShipment._id ? updatedShipment : shipment
        ),
        loading: false
      };
    case DELETE_SHIPMENT:
      return {
        ...state,
        shipments: state.shipments.filter(shipment => 
          shipment && shipment._id !== payload
        ),
        loading: false
      };
    case CLEAR_SHIPMENT:
      return {
        ...state,
        shipment: null
      };
    case SHIPMENT_ERROR:
      console.error('Shipment reducer error:', payload);
      return {
        ...state,
        error: payload,
        loading: false,
        shipmentsLoading: false
      };
    default:
      return state;
  }
} 