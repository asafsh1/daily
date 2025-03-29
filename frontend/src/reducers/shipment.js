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
  pagination: {
    total: 0,
    page: 1, 
    pages: 0
  },
  shipment: null,
  loading: false,
  error: null
};

export default function(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case SHIPMENTS_LOADING:
      return {
        ...state,
        loading: true
      };
    case SHIPMENT_LOADING:
      return {
        ...state,
        loading: true
      };
    case GET_SHIPMENTS:
      return {
        ...state,
        shipments: payload.shipments,
        pagination: payload.pagination,
        loading: false,
        error: null
      };
    case GET_SHIPMENT:
      return {
        ...state,
        shipment: payload,
        loading: false,
        error: null
      };
    case ADD_SHIPMENT:
      return {
        ...state,
        shipments: [payload, ...state.shipments],
        loading: false,
        error: null
      };
    case UPDATE_SHIPMENT:
      return {
        ...state,
        shipments: state.shipments.map(shipment => 
          shipment._id === payload._id ? payload : shipment
        ),
        loading: false,
        error: null
      };
    case DELETE_SHIPMENT:
      return {
        ...state,
        shipments: state.shipments.filter(shipment => shipment._id !== payload),
        loading: false,
        error: null
      };
    case CLEAR_SHIPMENT:
      return {
        ...state,
        shipment: null,
        error: null
      };
    case SHIPMENT_ERROR:
      console.error('Shipment reducer error:', payload);
      return {
        ...state,
        shipments: payload.fallbackData?.shipments || state.shipments,
        pagination: payload.fallbackData?.pagination || state.pagination,
        error: payload,
        loading: false
      };
    default:
      return state;
  }
} 