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
  SHIPMENT_LOADING
} from './types';
import io from 'socket.io-client';
import store from '../store';

// Initialize socket.io with the correct URL from environment variables
const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001');

// Get all shipments
export const getShipments = (page = 1, limit = 50) => async dispatch => {
  dispatch({ type: SHIPMENT_LOADING });
  
  try {
    const res = await axios.get(`/api/shipments?page=${page}&limit=${limit}`);

    dispatch({
      type: GET_SHIPMENTS,
      payload: res.data
    });
  } catch (err) {
    dispatch({
      type: SHIPMENT_ERROR,
      payload: { msg: err.response?.statusText, status: err.response?.status }
    });
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
export const addShipment = (formData, navigate) => async dispatch => {
  try {
    // Get current user from state
    const state = store.getState();
    const user = state.auth.user;
    
    // Add createdBy field if user is available
    const shipmentData = {
      ...formData,
      createdBy: user ? user.name : 'System User'
    };
    
    console.log('Adding shipment with data:', shipmentData);
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    console.log('Sending request to:', `${axios.defaults.baseURL}/api/shipments`);
    
    const res = await axios.post('/api/shipments', shipmentData, config);
    console.log('Shipment added successfully:', res.data);

    dispatch({
      type: ADD_SHIPMENT,
      payload: res.data
    });

    // Emit socket event
    socket.emit('shipmentUpdated', res.data);

    dispatch(setAlert('Shipment Added', 'success'));

    navigate('/shipments');
  } catch (err) {
    console.error('Error adding shipment:', err);
    
    // Log more details about the error
    if (err.response) {
      console.error('Server response:', {
        status: err.response.status,
        data: err.response.data,
        headers: err.response.headers
      });
    } else if (err.request) {
      console.error('Request was made but no response was received:', err.request);
    } else {
      console.error('Error setting up the request:', err.message);
    }
    
    if (err.response && err.response.data) {
      console.error('Server response data:', err.response.data);
      
      const errors = err.response.data.errors;
      if (errors) {
        errors.forEach(error => dispatch(setAlert(error.msg, 'danger')));
      }
    } else {
      dispatch(setAlert('Error adding shipment: ' + (err.message || 'Unknown error'), 'danger'));
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