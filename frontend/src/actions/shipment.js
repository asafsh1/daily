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
export const getShipments = () => async (dispatch) => {
  try {
    console.log('Fetching all shipments...');
    dispatch({ type: SHIPMENTS_LOADING });
    
    const res = await axios.get('/api/shipments');
    
    // Handle different response formats from API
    // The API might return { shipments: [...] } or directly an array
    let shipmentData = res.data;
    
    // Check if response has a shipments property (newer API format)
    if (res.data && typeof res.data === 'object' && res.data.shipments) {
      console.log('Found shipments property in response');
      shipmentData = res.data.shipments;
    }
    
    // Ensure we have an array
    if (!Array.isArray(shipmentData)) {
      console.error('Shipment data is not an array:', shipmentData);
      shipmentData = [];
    }
    
    // Normalize and validate each shipment object
    const normalizedShipments = shipmentData
      .filter(shipment => shipment && typeof shipment === 'object')
      .map(shipment => {
        // Create a new object with default values
        const normalized = {
          _id: shipment._id || null,
          customer: shipment.customer || null,
          shipper: shipment.shipper || null,
          origin: shipment.origin || '',
          destination: shipment.destination || '',
          status: shipment.status || shipment.shipmentStatus || 'Pending',
          mode: shipment.mode || 'Air',
          dateAdded: shipment.dateAdded || new Date(),
          // Ensure legs is always an array
          legs: Array.isArray(shipment.legs) ? shipment.legs : []
        };
        
        // Only include shipments with valid IDs
        if (!normalized._id) {
          console.error('Shipment missing _id, will be filtered out:', shipment);
          return null;
        }
        
        return normalized;
      })
      .filter(Boolean); // Remove null entries
    
    console.log(`Normalized ${normalizedShipments.length} valid shipments`);
    
    dispatch({
      type: GET_SHIPMENTS,
      payload: normalizedShipments
    });
    
    return normalizedShipments;
  } catch (err) {
    console.error('Error fetching shipments:', err);
    
    // Get detailed error information
    const errorMessage = err.response?.data?.message || err.message;
    
    dispatch({
      type: SHIPMENT_ERROR,
      payload: { 
        msg: errorMessage, 
        status: err.response?.status || 'Network Error'
      }
    });
    
    // Return empty array to prevent UI errors
    return [];
  }
};

// Get single shipment by ID
export const getShipment = (id) => async (dispatch) => {
  try {
    dispatch({
      type: SHIPMENT_LOADING
    });

    console.log(`Fetching shipment with ID: ${id}`);
    const res = await axios.get(`/api/shipments/${id}`);
    console.log(`Shipment API response:`, res.data);
    
    let shipmentData = res.data;
    
    // Check if there are legs in the response and log them
    if (shipmentData.legs && Array.isArray(shipmentData.legs)) {
      console.log(`Shipment has ${shipmentData.legs.length} legs in the response`);
    } else {
      console.log(`Shipment has no legs array in the response`);
      shipmentData.legs = []; // Ensure legs is always an array
    }
    
    dispatch({
      type: GET_SHIPMENT,
      payload: shipmentData
    });
    
    return shipmentData;
  } catch (err) {
    console.error('Error fetching shipment:', err);
    
    // Get detailed error information
    const errorMessage = err.response && err.response.data 
      ? err.response.data.message 
      : err.message;
      
    dispatch({
      type: SHIPMENT_ERROR,
      payload: { 
        msg: errorMessage, 
        status: err.response ? err.response.status : 'Network Error'
      }
    });
    
    // Re-throw so callers can handle it
    throw err;
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
    
    // Preserve legs if not explicitly set
    if (!shipmentData.legs && state.shipment.shipment && state.shipment.shipment.legs) {
      shipmentData.legs = state.shipment.shipment.legs;
    }
    
    // Preserve customer data
    if (state.shipment.shipment && state.shipment.shipment.customer) {
      // If the customer hasn't changed, preserve the original customer data
      if (shipmentData.customer === state.shipment.shipment.customer._id ||
          (state.shipment.shipment.customer._id && 
           shipmentData.customer === state.shipment.shipment.customer._id.toString())) {
        shipmentData.customer = state.shipment.shipment.customer;
      }
    }
    
    console.log('Updating shipment with data:', shipmentData);
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const res = await axios.put(`/api/shipments/${id}`, shipmentData, config);

    if (res && res.data) {
      // Ensure the response data includes the legs array
      const updatedShipment = res.data;
      if (!updatedShipment.legs && state.shipment.shipment && state.shipment.shipment.legs) {
        updatedShipment.legs = state.shipment.shipment.legs;
      }
      
      dispatch({
        type: UPDATE_SHIPMENT,
        payload: updatedShipment
      });

      // Emit socket event
      socket.emit('shipmentUpdated', updatedShipment);

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
  try {
    console.log(`Attempting to delete shipment with ID: ${id}`);
    
    const res = await axios.delete(`/api/shipments/${id}`);
    console.log('Delete API response:', res.data);
    
    if (res.data && res.data.id) {
      console.log(`Successfully deleted shipment with ID: ${id}`);
      
      // Dispatch the deletion action to update the Redux store
      dispatch({
        type: DELETE_SHIPMENT,
        payload: id
      });
      
      dispatch(setAlert('Shipment Removed', 'success'));
      return true;
    } else {
      console.warn('Delete API returned success but without expected data format:', res.data);
      dispatch(setAlert('Shipment may not have been fully removed', 'warning'));
      return false;
    }
  } catch (err) {
    console.error('Error deleting shipment:', err);
    
    // Extract detailed error info if available
    const errorMsg = err.response?.data?.msg || err.message || 'Unknown error';
    const errorStatus = err.response?.status || 500;
    
    console.error(`Delete error (${errorStatus}): ${errorMsg}`);
    
    dispatch({
      type: SHIPMENT_ERROR,
      payload: { 
        msg: errorMsg,
        status: errorStatus 
      }
    });
    
    dispatch(setAlert(`Error deleting shipment: ${errorMsg}`, 'danger'));
    return false;
  }
};

// Clear shipment
export const clearShipment = () => dispatch => {
  dispatch({ type: CLEAR_SHIPMENT });
}; 