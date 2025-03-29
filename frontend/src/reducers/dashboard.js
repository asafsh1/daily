import {
  GET_DASHBOARD_SUMMARY,
  GET_SHIPMENTS_BY_CUSTOMER,
  GET_SHIPMENTS_BY_DATE,
  GET_OVERDUE_NON_INVOICED,
  DASHBOARD_ERROR,
  DASHBOARD_LOADING
} from '../actions/types';

const initialState = {
  summary: null,
  shipmentsByCustomer: [],
  shipmentsByDate: [],
  overdueNonInvoiced: [],
  loading: false,
  error: null
};

export default function(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case DASHBOARD_LOADING:
      return {
        ...state,
        loading: true
      };
    case GET_DASHBOARD_SUMMARY:
      console.log('Dashboard reducer: GET_DASHBOARD_SUMMARY with payload:', payload);
      return {
        ...state,
        summary: payload,
        loading: false,
        error: null
      };
    case GET_SHIPMENTS_BY_CUSTOMER:
      return {
        ...state,
        shipmentsByCustomer: payload,
        loading: false,
        error: null
      };
    case GET_SHIPMENTS_BY_DATE:
      return {
        ...state,
        shipmentsByDate: payload,
        loading: false,
        error: null
      };
    case GET_OVERDUE_NON_INVOICED:
      return {
        ...state,
        overdueNonInvoiced: payload,
        loading: false,
        error: null
      };
    case DASHBOARD_ERROR:
      console.error('Dashboard reducer error:', payload);
      return {
        ...state,
        error: payload,
        loading: false
      };
    default:
      return state;
  }
} 