import axios from '../../utils/axiosConfig';
import {
  GET_DASHBOARD_DATA,
  DASHBOARD_ERROR,
  GET_SHIPMENTS_BY_CUSTOMER,
  GET_SHIPMENTS_BY_DATE,
  GET_MONTHLY_STATS
} from './types';

// Fetch dashboard data
export const fetchDashboardData = () => async dispatch => {
  console.log('Fetching dashboard summary from API...');
  try {
    // Try the authenticated endpoint first
    try {
      const res = await axios.get('/api/dashboard/summary');
      dispatch({
        type: GET_DASHBOARD_DATA,
        payload: res.data
      });
      return;
    } catch (error) {
      console.log('Error with authenticated summary endpoint, trying public endpoint...');
      // If authentication fails, try the public endpoint
      const publicRes = await axios.get('/api/dashboard/public-summary');
      dispatch({
        type: GET_DASHBOARD_DATA,
        payload: publicRes.data
      });
      return;
    }
  } catch (err) {
    console.error('Error fetching dashboard data:', err.message);
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { msg: err.response?.data?.msg || 'Server Error', status: err.response?.status }
    });
  }
};

// Fetch shipments by customer
export const fetchShipmentsByCustomer = () => async dispatch => {
  try {
    const res = await axios.get('/api/dashboard/shipments-by-customer');
    dispatch({
      type: GET_SHIPMENTS_BY_CUSTOMER,
      payload: res.data
    });
  } catch (err) {
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { msg: err.response.data.msg, status: err.response.status }
    });
  }
};

// Fetch shipments by date
export const fetchShipmentsByDate = () => async dispatch => {
  try {
    const res = await axios.get('/api/dashboard/shipments-by-date');
    dispatch({
      type: GET_SHIPMENTS_BY_DATE,
      payload: res.data
    });
  } catch (err) {
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { msg: err.response?.data?.msg || 'Error fetching shipments by date', status: err.response?.status }
    });
  }
};

// Fetch monthly stats
export const fetchMonthlyStats = () => async dispatch => {
  try {
    const res = await axios.get('/api/dashboard/monthly-stats');
    dispatch({
      type: GET_MONTHLY_STATS,
      payload: res.data
    });
  } catch (err) {
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { msg: err.response?.data?.msg || 'Error fetching monthly stats', status: err.response?.status }
    });
  }
}; 