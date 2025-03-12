import {
  GET_DASHBOARD_SUMMARY,
  GET_SHIPMENTS_BY_CUSTOMER,
  GET_SHIPMENTS_BY_DATE,
  GET_OVERDUE_NON_INVOICED,
  DASHBOARD_ERROR,
  DASHBOARD_LOADING
} from '../actions/types';

const initialState = {
  loading: true,
  error: {},
  data: null
};

const dashboardReducer = (state = initialState, action) => {
  const { type, payload } = action;

  switch (type) {
    case DASHBOARD_LOADING:
      return {
        ...state,
        loading: true
      };
    case GET_DASHBOARD_SUMMARY:
      return {
        ...state,
        data: payload,
        loading: false
      };
    case GET_SHIPMENTS_BY_CUSTOMER:
      return {
        ...state,
        shipmentsByCustomer: payload,
        loading: false
      };
    case GET_SHIPMENTS_BY_DATE:
      return {
        ...state,
        shipmentsByDate: payload,
        loading: false
      };
    case GET_OVERDUE_NON_INVOICED:
      return {
        ...state,
        overdueNonInvoiced: payload,
        loading: false
      };
    case DASHBOARD_ERROR:
      return {
        ...state,
        error: payload,
        loading: false
      };
    default:
      return state;
  }
};

export default dashboardReducer; 