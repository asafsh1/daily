import axios from '../utils/axiosConfig';
import {
  GET_DASHBOARD_SUMMARY,
  DASHBOARD_ERROR,
  GET_SHIPMENTS_BY_CUSTOMER,
  GET_SHIPMENTS_BY_DATE,
  GET_OVERDUE_NON_INVOICED,
  GET_MONTHLY_STATS,
  GET_ALL_DASHBOARD_DATA
} from './types';

// Get all dashboard data in one request from the public endpoint
export const getAllDashboardData = () => async dispatch => {
  try {
    console.log('Fetching all dashboard data from public API...');
    const res = await axios.get('/api/dashboard/public-all');
    
    // Dispatch all data at once
    dispatch({
      type: GET_ALL_DASHBOARD_DATA,
      payload: res.data
    });
    
    // Also dispatch individual data segments
    if (res.data.summary) {
      dispatch({
        type: GET_DASHBOARD_SUMMARY,
        payload: res.data.summary
      });
    }
    
    if (res.data.customerData) {
      dispatch({
        type: GET_SHIPMENTS_BY_CUSTOMER,
        payload: res.data.customerData
      });
    }
    
    if (res.data.dailyStats) {
      dispatch({
        type: GET_SHIPMENTS_BY_DATE,
        payload: res.data.dailyStats
      });
    }
    
    return res.data;
  } catch (err) {
    console.error('Error fetching all dashboard data:', err.message);
    
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { msg: err.response?.data?.msg || err.message }
    });
    
    throw err;
  }
};

// Get dashboard summary data
export const getDashboardSummary = () => async dispatch => {
  try {
    console.log('Fetching dashboard summary from API...');
    try {
      const res = await axios.get('/api/dashboard/summary');
      
      dispatch({
        type: GET_DASHBOARD_SUMMARY,
        payload: res.data
      });
      
      return res.data;
    } catch (error) {
      console.log('Error with authenticated summary endpoint, trying public endpoint...');
      try {
        const publicRes = await axios.get('/api/dashboard/public-summary');
        
        dispatch({
          type: GET_DASHBOARD_SUMMARY,
          payload: publicRes.data
        });
        
        return publicRes.data;
      } catch (publicError) {
        console.log('Error with public summary endpoint, trying all-in-one endpoint...');
        // If all else fails, use the all-in-one endpoint
        const allData = await dispatch(getAllDashboardData());
        return allData?.summary || {};
      }
    }
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
    try {
      const res = await axios.get('/api/dashboard/shipments-by-customer');
      
      dispatch({
        type: GET_SHIPMENTS_BY_CUSTOMER,
        payload: res.data
      });
      
      return res.data;
    } catch (error) {
      console.log('Error fetching shipments by customer, trying all-in-one endpoint...');
      const allData = await dispatch(getAllDashboardData());
      return allData?.customerData || [];
    }
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
    try {
      const res = await axios.get('/api/dashboard/shipments-by-date');
      
      dispatch({
        type: GET_SHIPMENTS_BY_DATE,
        payload: res.data
      });
      
      return res.data;
    } catch (error) {
      console.log('Error fetching shipments by date, trying all-in-one endpoint...');
      const allData = await dispatch(getAllDashboardData());
      return allData?.dailyStats || [];
    }
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