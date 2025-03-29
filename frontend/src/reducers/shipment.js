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
      return {
        ...state,
        shipments: Array.isArray(payload) ? payload : [],
        loading: false,
        shipmentsLoading: false
      };
    case GET_SHIPMENT:
      return {
        ...state,
        shipment: payload,
        loading: false
      };
    case ADD_SHIPMENT:
      return {
        ...state,
        shipments: [payload, ...state.shipments],
        loading: false
      };
    case UPDATE_SHIPMENT:
      return {
        ...state,
        shipments: state.shipments.map(shipment =>
          shipment._id === payload._id ? payload : shipment
        ),
        loading: false
      };
    case DELETE_SHIPMENT:
      return {
        ...state,
        shipments: state.shipments.filter(shipment => shipment._id !== payload),
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