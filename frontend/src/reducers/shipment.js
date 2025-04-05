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

// Helper function to validate shipment object - make it more permissive
const validateShipment = (shipment) => {
  // Accept any object, even without _id
  if (!shipment || typeof shipment !== 'object') {
    console.warn('Non-object shipment found, using anyway:', shipment);
    return shipment; // Just return it as is instead of null
  }
  
  // Add fallbacks but don't filter out shipments missing _id
  return {
    ...shipment,
    _id: shipment._id || `temp-${Date.now()}-${Math.random()}`, // Generate temp ID if missing
    legs: Array.isArray(shipment.legs) ? shipment.legs : [],
    status: shipment.status || 'Pending',
    dateAdded: shipment.dateAdded || new Date(),
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
      // Be very permissive - use payload directly if it's an array
      let validShipments = [];
      
      if (Array.isArray(payload)) {
        validShipments = payload.map(shipment => validateShipment(shipment));
      } else if (payload && typeof payload === 'object' && Array.isArray(payload.shipments)) {
        validShipments = payload.shipments.map(shipment => validateShipment(shipment));
      } else {
        // Last resort, use payload directly
        validShipments = Array.isArray(payload) ? payload : [];
      }
      
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