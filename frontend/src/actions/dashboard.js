import axios from '../utils/axiosConfig';
import {
  GET_DASHBOARD_SUMMARY,
  GET_SHIPMENTS_BY_CUSTOMER,
  GET_SHIPMENTS_BY_DATE,
  GET_OVERDUE_NON_INVOICED,
  DASHBOARD_ERROR,
  DASHBOARD_LOADING
} from './types';

// Get dashboard summary
export const getDashboardSummary = () => async dispatch => {
  dispatch({ type: DASHBOARD_LOADING });
  
  try {
    const res = await axios.get('/api/dashboard/stats');

    dispatch({
      type: GET_DASHBOARD_SUMMARY,
      payload: res.data
    });
  } catch (err) {
    console.error('Error loading dashboard summary:', err);
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { 
        msg: err.response ? err.response.statusText : 'Server Error', 
        status: err.response ? err.response.status : 500 
      }
    });
  }
};

// Get shipments by customer
export const getShipmentsByCustomer = () => async dispatch => {
  try {
    // Get all shipments and group them by customer
    const res = await axios.get('/api/shipments');
    
    // Process the data to group by customer
    const shipmentsByCustomer = [];
    const customerCounts = {};
    
    res.data.forEach(shipment => {
      if (shipment.customer) {
        if (customerCounts[shipment.customer]) {
          customerCounts[shipment.customer]++;
        } else {
          customerCounts[shipment.customer] = 1;
        }
      }
    });
    
    // Convert to array format for chart
    for (const customer in customerCounts) {
      shipmentsByCustomer.push({
        customer,
        count: customerCounts[customer]
      });
    }
    
    // Sort by count (descending)
    shipmentsByCustomer.sort((a, b) => b.count - a.count);
    
    // Take top 10
    const top10 = shipmentsByCustomer.slice(0, 10);

    dispatch({
      type: GET_SHIPMENTS_BY_CUSTOMER,
      payload: top10
    });
  } catch (err) {
    console.error('Error loading shipments by customer:', err);
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { 
        msg: err.response ? err.response.statusText : 'Server Error', 
        status: err.response ? err.response.status : 500 
      }
    });
  }
};

// Get shipments by date
export const getShipmentsByDate = () => async dispatch => {
  try {
    const res = await axios.get('/api/dashboard/monthly-stats');

    dispatch({
      type: GET_SHIPMENTS_BY_DATE,
      payload: res.data
    });
  } catch (err) {
    console.error('Error loading shipments by date:', err);
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { 
        msg: err.response ? err.response.statusText : 'Server Error', 
        status: err.response ? err.response.status : 500 
      }
    });
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
  } catch (err) {
    console.error('Error loading overdue non-invoiced shipments:', err);
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { 
        msg: err.response ? err.response.statusText : 'Server Error', 
        status: err.response ? err.response.status : 500 
      }
    });
  }
}; 