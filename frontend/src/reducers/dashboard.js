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
  isLoading: true,
  error: null
};

const dashboardReducer = function(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case DASHBOARD_LOADING:
      return {
        ...state,
        isLoading: true
      };
    case GET_DASHBOARD_SUMMARY:
      return {
        ...state,
        summary: payload,
        isLoading: false,
        error: null
      };
    case GET_SHIPMENTS_BY_CUSTOMER:
      return {
        ...state,
        shipmentsByCustomer: payload,
        isLoading: false,
        error: null
      };
    case GET_SHIPMENTS_BY_DATE:
      return {
        ...state,
        shipmentsByDate: payload,
        isLoading: false,
        error: null
      };
    case GET_OVERDUE_NON_INVOICED:
      return {
        ...state,
        overdueNonInvoiced: payload,
        isLoading: false,
        error: null
      };
    case DASHBOARD_ERROR:
      return {
        ...state,
        error: payload,
        isLoading: false
      };
    default:
      return state;
  }
};

export default dashboardReducer; 