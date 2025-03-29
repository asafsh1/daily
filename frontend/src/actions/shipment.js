import axios from '../utils/axiosConfig';
import { setAlert } from './alert';
import {
  GET_SHIPMENTS,
  GET_SHIPMENT,
  SHIPMENT_ERROR,
  ADD_SHIPMENT,
  UPDATE_SHIPMENT,
  DELETE_SHIPMENT,
  CLEAR_SHIPMENT,
  SHIPMENT_LOADING,
  SHIPMENTS_LOADING
} from './types';
import io from 'socket.io-client';
import store from '../store';

// Initialize socket.io with the correct URL from environment variables
const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001');

// Get all shipments
export const getShipments = (page = 1, limit = 50) => async dispatch => {
  try {
    dispatch({ type: SHIPMENTS_LOADING });
    
    console.log('Fetching shipments from API...');
    const res = await axios.get(`/api/shipments?page=${page}&limit=${limit}`);
    
    // Check if we received an error response with empty shipments
    const shipments = res.data.shipments || [];
    const pagination = res.data.pagination || { total: 0, page: 1, pages: 0 };
    
    dispatch({
      type: GET_SHIPMENTS,
      payload: { shipments, pagination }
    });
  } catch (err) {
    console.error('Error in getShipments action:', err);
    
    // Create fallback data for empty shipments
    const fallbackData = { 
      shipments: [], 
      pagination: { total: 0, page: 1, pages: 0 } 
    };
    
    dispatch({
      type: SHIPMENT_ERROR,
      payload: { 
        msg: err.response?.statusText || 'Server Error', 
        status: err.response?.status || 500,
        fallbackData 
      }
    });
    
    // Still return the fallback data so components can render something
    return fallbackData;
  }
};

// Get shipment by ID
export const getShipment = id => async dispatch => {
  dispatch({ type: SHIPMENT_LOADING });
  
  try {
    const res = await axios.get(`/api/shipments/${id}`);

    dispatch({
      type: GET_SHIPMENT,
      payload: res.data
    });
  } catch (err) {
    dispatch({
      type: SHIPMENT_ERROR,
      payload: { msg: err.response.statusText, status: err.response.status }
    });
  }
};

// Add shipment
export const addShipment = (formData, navigate) => async (dispatch) => {
  try {
    const res = await axios.post('/api/shipments', formData);

    dispatch({
      type: ADD_SHIPMENT,
      payload: res.data
    });

    dispatch(setAlert('Shipment Added', 'success'));

    // Only navigate if the navigate function is provided
    if (navigate) {
      navigate('/shipments');
    }
    
    // Return the created shipment for further processing
    return res.data;
  } catch (err) {
    const errors = err.response.data.errors;

    if (errors) {
      errors.forEach((error) => dispatch(setAlert(error.msg, 'danger')));
    }

    dispatch({
      type: SHIPMENT_ERROR,
      payload: { msg: err.response.statusText, status: err.response.status }
    });
    
    // Return null to indicate failure
    return null;
  }
};

// Update shipment
export const updateShipment = (id, formData, navigate) => async dispatch => {
  try {
    // Get current user from state
    const state = store.getState();
    const user = state.auth.user;
    
    // Add updatedBy field if user is available
    const shipmentData = {
      ...formData,
      updatedBy: user ? user.name : 'System User'
    };
    
    // Don't overwrite createdBy if it's an update
    if (!shipmentData.createdBy) {
      const currentShipment = state.shipment.shipment;
      if (currentShipment && currentShipment.createdBy) {
        shipmentData.createdBy = currentShipment.createdBy;
      }
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const res = await axios.put(`/api/shipments/${id}`, shipmentData, config);

    if (res && res.data) {
      dispatch({
        type: UPDATE_SHIPMENT,
        payload: res.data
      });

      // Emit socket event
      socket.emit('shipmentUpdated', res.data);

      dispatch(setAlert('Shipment Updated', 'success'));

      // Only navigate if navigate function is provided
      if (navigate) {
        navigate('/shipments');
      }
    }
  } catch (err) {
    console.error('Error updating shipment:', err);
    
    if (err.response && err.response.data && err.response.data.errors) {
      err.response.data.errors.forEach(error => dispatch(setAlert(error.msg, 'danger')));
    } else {
      dispatch(setAlert('Error updating shipment', 'danger'));
    }

    dispatch({
      type: SHIPMENT_ERROR,
      payload: { 
        msg: err.response ? err.response.statusText : 'Server Error',
        status: err.response ? err.response.status : 500
      }
    });
  }
};

// Delete shipment
export const deleteShipment = id => async dispatch => {
  if (window.confirm('Are you sure you want to delete this shipment?')) {
    try {
      await axios.delete(`/api/shipments/${id}`);

      dispatch({
        type: DELETE_SHIPMENT,
        payload: id
      });

      dispatch(setAlert('Shipment Removed', 'success'));
    } catch (err) {
      dispatch({
        type: SHIPMENT_ERROR,
        payload: { msg: err.response.statusText, status: err.response.status }
      });
    }
  }
};

// Clear shipment
export const clearShipment = () => dispatch => {
  dispatch({ type: CLEAR_SHIPMENT });
}; 