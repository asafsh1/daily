import axios from '../../utils/axiosConfig';
import {
  GET_DASHBOARD_DATA,
  DASHBOARD_ERROR,
  GET_SHIPMENTS_BY_CUSTOMER,
  GET_SHIPMENTS_BY_DATE,
  GET_MONTHLY_STATS,
  GET_ALL_DASHBOARD_DATA
} from '../../actions/types';

// Fetch all dashboard data from a single endpoint
export const fetchAllDashboardData = () => async dispatch => {
  console.log('Fetching all dashboard data from public API...');
  try {
    const res = await axios.get('/api/dashboard/public-all');
    
    // Dispatch all data at once
    dispatch({
      type: GET_ALL_DASHBOARD_DATA,
      payload: res.data
    });
    
    // Also dispatch individual data segments
    if (res.data.summary) {
      dispatch({
        type: GET_DASHBOARD_DATA,
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
    
    if (res.data.monthlyStats) {
      dispatch({
        type: GET_MONTHLY_STATS,
        payload: res.data.monthlyStats
      });
    }
    
    return res.data;
  } catch (err) {
    console.error('Error fetching all dashboard data:', err.message);
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { msg: err.response?.data?.msg || 'Error fetching dashboard data', status: err.response?.status }
    });
  }
};

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
      try {
        const publicRes = await axios.get('/api/dashboard/public-summary');
        dispatch({
          type: GET_DASHBOARD_DATA,
          payload: publicRes.data
        });
        return;
      } catch (publicError) {
        console.log('Error with public summary endpoint, trying all-in-one endpoint...');
        // If that fails, try the new all-in-one endpoint
        const { summary } = await dispatch(fetchAllDashboardData());
        // No need to dispatch here as fetchAllDashboardData already does it
        return;
      }
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
    try {
      const res = await axios.get('/api/dashboard/shipments-by-customer');
      dispatch({
        type: GET_SHIPMENTS_BY_CUSTOMER,
        payload: res.data
      });
    } catch (error) {
      console.log('Error fetching shipments by customer, trying all-in-one endpoint...');
      // If that fails, try the new all-in-one endpoint
      await dispatch(fetchAllDashboardData());
    }
  } catch (err) {
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { msg: err.response?.data?.msg || 'Error fetching shipments by customer', status: err.response?.status }
    });
  }
};

// Fetch shipments by date
export const fetchShipmentsByDate = () => async dispatch => {
  try {
    try {
      const res = await axios.get('/api/dashboard/shipments-by-date');
      dispatch({
        type: GET_SHIPMENTS_BY_DATE,
        payload: res.data
      });
    } catch (error) {
      console.log('Error fetching shipments by date, trying all-in-one endpoint...');
      // If that fails, try the new all-in-one endpoint
      await dispatch(fetchAllDashboardData());
    }
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
    try {
      const res = await axios.get('/api/dashboard/monthly-stats');
      dispatch({
        type: GET_MONTHLY_STATS,
        payload: res.data
      });
    } catch (error) {
      console.log('Error fetching monthly stats, trying all-in-one endpoint...');
      // If that fails, try the new all-in-one endpoint
      await dispatch(fetchAllDashboardData());
    }
  } catch (err) {
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { msg: err.response?.data?.msg || 'Error fetching monthly stats', status: err.response?.status }
    });
  }
}; 