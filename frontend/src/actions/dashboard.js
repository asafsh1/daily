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
    
    // Check if we received fallback data due to database issues
    const data = res.data.fallbackData || res.data;
    
    // Process data to include paths and actions
    if (data) {
      // Add stats data for the cards
      data.statsData = [
        {
          title: 'Total Shipments',
          value: data.totalShipments || 0,
          footer: 'All time shipments',
          icon: 'fa-shipping-fast',
          path: '/shipments'
        },
        {
          title: 'Pending',
          value: data.shipmentsByStatus?.Pending || 0,
          footer: 'Waiting to be shipped',
          icon: 'fa-clock',
          path: '/shipments?status=Pending'
        },
        {
          title: 'In Transit',
          value: data.shipmentsByStatus?.['In Transit'] || 0,
          footer: 'Currently in transit',
          icon: 'fa-plane',
          path: '/shipments?status=In Transit'
        },
        {
          title: 'Non-Invoiced',
          value: data.totalNonInvoiced || 0,
          footer: 'Shipments without invoice',
          icon: 'fa-file-invoice-dollar',
          path: '/shipments?invoiced=false'
        }
      ];
      
      // Ensure shipmentsByStatus has all statuses with at least 0 count
      data.shipmentsByStatus = {
        'Pending': data.shipmentsByStatus?.Pending || 0,
        'In Transit': data.shipmentsByStatus?.['In Transit'] || 0,
        'Arrived': data.shipmentsByStatus?.Arrived || 0,
        'Delayed': data.shipmentsByStatus?.Delayed || 0,
        'Canceled': data.shipmentsByStatus?.Canceled || 0,
        ...data.shipmentsByStatus
      };
    }
    
    dispatch({
      type: GET_DASHBOARD_SUMMARY,
      payload: data
    });
    
    return data;
  } catch (err) {
    console.error('Error loading dashboard data:', err);
    
    // Create fallback data for the dashboard when the API fails completely
    const fallbackData = {
      totalShipments: 0,
      recentShipments: [],
      shipmentsByStatus: {
        'Pending': 0,
        'In Transit': 0,
        'Arrived': 0,
        'Delayed': 0,
        'Canceled': 0
      },
      totalNonInvoiced: 0,
      shipmentsByCustomer: [],
      statsData: [
        {
          title: 'Total Shipments',
          value: 0,
          footer: 'All time shipments',
          icon: 'fa-shipping-fast',
          path: '/shipments'
        },
        {
          title: 'Pending',
          value: 0,
          footer: 'Waiting to be shipped',
          icon: 'fa-clock',
          path: '/shipments?status=Pending'
        },
        {
          title: 'In Transit',
          value: 0,
          footer: 'Currently in transit',
          icon: 'fa-plane',
          path: '/shipments?status=In Transit'
        },
        {
          title: 'Non-Invoiced',
          value: 0,
          footer: 'Shipments without invoice',
          icon: 'fa-file-invoice-dollar',
          path: '/shipments?invoiced=false'
        }
      ]
    };
    
    dispatch({
      type: DASHBOARD_ERROR,
      payload: { 
        msg: err.response?.statusText || 'Server Error', 
        status: err.response?.status || 500,
        fallbackData: fallbackData
      }
    });
    
    // Still return the fallback data so components can render something
    return fallbackData;
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
    
    shipmentData.forEach(shipment => {
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
    console.log('Processed customer data for chart:', top10);

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