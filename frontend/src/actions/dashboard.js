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
  try {
    dispatch({ type: DASHBOARD_LOADING });
    
    console.log('Fetching dashboard summary from API...');
    const res = await axios.get('/api/dashboard/summary');
    console.log('Dashboard data received:', res.data);
    
    // Process data to include paths and actions
    if (res.data) {
      // Add stats data for the cards
      res.data.statsData = [
        {
          title: 'Total Shipments',
          value: res.data.totalShipments || 0,
          footer: 'All time shipments',
          icon: 'fa-shipping-fast',
          path: '/shipments'
        },
        {
          title: 'Pending',
          value: res.data.shipmentsByStatus?.Pending || 0,
          footer: 'Waiting to be shipped',
          icon: 'fa-clock',
          path: '/shipments?status=Pending'
        },
        {
          title: 'In Transit',
          value: res.data.shipmentsByStatus?.['In Transit'] || 0,
          footer: 'Currently in transit',
          icon: 'fa-plane',
          path: '/shipments?status=In Transit'
        },
        {
          title: 'Non-Invoiced',
          value: res.data.totalNonInvoiced || 0,
          footer: 'Shipments without invoice',
          icon: 'fa-file-invoice-dollar',
          path: '/shipments?invoiced=false'
        }
      ];
      
      // Ensure shipmentsByStatus has all statuses with at least 0 count
      res.data.shipmentsByStatus = {
        'Pending': res.data.shipmentsByStatus?.Pending || 0,
        'In Transit': res.data.shipmentsByStatus?.['In Transit'] || 0,
        'Arrived': res.data.shipmentsByStatus?.Arrived || 0,
        'Delayed': res.data.shipmentsByStatus?.Delayed || 0,
        'Canceled': res.data.shipmentsByStatus?.Canceled || 0,
        ...res.data.shipmentsByStatus
      };
    }
    
    dispatch({
      type: GET_DASHBOARD_SUMMARY,
      payload: res.data
    });
    
    return res.data;
  } catch (err) {
    console.error('Error loading dashboard data:', err);
    
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { 
        msg: err.response?.statusText || 'Server Error', 
        status: err.response?.status || 500
      }
    });
    
    throw err;
  }
};

// Get shipments by customer
export const getShipmentsByCustomer = () => async dispatch => {
  try {
    // Get all shipments and group them by customer
    const res = await axios.get('/api/shipments?limit=100');
    console.log('Shipments by customer data:', res.data);
    
    // Process the data to group by customer
    const shipmentsByCustomer = [];
    const customerCounts = {};
    
    // Handle either the old data format or the new paginated format
    const shipmentData = res.data.shipments || res.data;
    
    // Process shipments with more robust customer handling
    shipmentData.forEach(shipment => {
      if (!shipment) return;
      
      let customerName = 'Unknown';
      let customerId = null;
      
      // Handle different customer formats
      if (shipment.customer) {
        if (typeof shipment.customer === 'object') {
          // If customer is an object with name property
          customerName = shipment.customer.name || 'Unknown';
          customerId = shipment.customer._id;
        } else if (typeof shipment.customer === 'string') {
          // If customer is a string (could be ID or actual name)
          customerName = shipment.customer;
          customerId = shipment.customer;
        }
      }
      
      // Use a unique identifier that works for both formats
      const customerKey = customerId ? customerId.toString() : customerName;
      
      // Track customer counts
      if (customerCounts[customerKey]) {
        customerCounts[customerKey].count++;
      } else {
        customerCounts[customerKey] = {
          customer: customerName,
          count: 1
        };
      }
    });
    
    // Convert to array format for chart
    for (const key in customerCounts) {
      shipmentsByCustomer.push(customerCounts[key]);
    }
    
    // Sort by count (descending)
    shipmentsByCustomer.sort((a, b) => b.count - a.count);
    
    console.log('Processed customer data for chart:', shipmentsByCustomer);

    dispatch({
      type: GET_SHIPMENTS_BY_CUSTOMER,
      payload: shipmentsByCustomer
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
    console.log('Monthly stats data:', res.data);

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
    console.log('Overdue non-invoiced data:', res.data);

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