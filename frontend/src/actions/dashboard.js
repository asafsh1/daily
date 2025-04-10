import axios from '../utils/axiosConfig';
import {
  GET_DASHBOARD_SUMMARY,
  DASHBOARD_ERROR,
  GET_SHIPMENTS_BY_CUSTOMER,
  GET_SHIPMENTS_BY_DATE,
  GET_OVERDUE_NON_INVOICED
} from './types';

// Get dashboard summary data
export const getDashboardSummary = () => async dispatch => {
  try {
    console.log('Fetching dashboard summary from API...');
    const res = await axios.get('/api/dashboard/summary');
    
    dispatch({
      type: GET_DASHBOARD_SUMMARY,
      payload: res.data
    });
    
    return res.data;
  } catch (err) {
    console.error('Error fetching dashboard data:', err.message);
    
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { msg: err.response?.data?.msg || err.message }
    });
    
    throw err;
  }
};

// Get shipments by customer
export const getShipmentsByCustomer = () => async dispatch => {
  try {
    const res = await axios.get('/api/dashboard/shipments-by-customer');
    
    dispatch({
      type: GET_SHIPMENTS_BY_CUSTOMER,
      payload: res.data
    });
    
    return res.data;
  } catch (err) {
    console.error('Error fetching shipments by customer:', err.message);
    
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { msg: err.response?.data?.msg || err.message }
    });
    
    throw err;
  }
};

// Get shipments by date
export const getShipmentsByDate = () => async dispatch => {
  try {
    const res = await axios.get('/api/dashboard/shipments-by-date');
    
    dispatch({
      type: GET_SHIPMENTS_BY_DATE,
      payload: res.data
    });
    
    return res.data;
  } catch (err) {
    console.error('Error fetching shipments by date:', err.message);
    
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { msg: err.response?.data?.msg || err.message }
    });
    
    throw err;
  }
};

// Get overdue non-invoiced shipments
export const getOverdueNonInvoiced = () => async dispatch => {
  try {
    const res = await axios.get('/api/dashboard/overdue-non-invoiced');
    
    dispatch({
      type: GET_OVERDUE_NON_INVOICED,
      payload: res.data
    });
    
    return res.data;
  } catch (err) {
    console.error('Error fetching overdue non-invoiced shipments:', err.message);
    
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { msg: err.response?.data?.msg || err.message }
    });
    
    throw err;
  }
};

// Get detailed shipments for charts
export const getDetailedShipments = () => async () => {
  try {
    const res = await axios.get('/api/shipments?limit=100');
    return res.data.shipments || res.data;
  } catch (err) {
    console.error('Error fetching detailed shipments:', err.message);
    return [];
  }
}; 