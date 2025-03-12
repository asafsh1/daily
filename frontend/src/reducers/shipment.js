import {
  GET_SHIPMENTS,
  GET_SHIPMENT,
  SHIPMENT_ERROR,
  ADD_SHIPMENT,
  UPDATE_SHIPMENT,
  DELETE_SHIPMENT,
  CLEAR_SHIPMENT,
  SHIPMENT_LOADING
} from '../actions/types';

const initialState = {
  shipments: [],
  shipment: null,
  loading: true,
  error: {}
};

const shipmentReducer = (state = initialState, action) => {
  const { type, payload } = action;

  switch (type) {
    case SHIPMENT_LOADING:
      return {
        ...state,
        loading: true
      };
    case GET_SHIPMENTS:
      return {
        ...state,
        shipments: payload,
        loading: false
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
        shipment: payload,
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
        shipment: null,
        loading: false
      };
    case SHIPMENT_ERROR:
      return {
        ...state,
        error: payload,
        loading: false
      };
    default:
      return state;
  }
};

export default shipmentReducer; 