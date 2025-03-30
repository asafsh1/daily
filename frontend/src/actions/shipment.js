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
export const getShipments = () => async dispatch => {
  try {
    dispatch({ type: CLEAR_SHIPMENT });
    dispatch({ type: SHIPMENTS_LOADING });
    
    console.log('Fetching shipments from API...');
    let res;
    try {
      res = await axios.get('/api/shipments');
      console.log('API response status:', res.status);
    } catch (apiErr) {
      console.error('API call failed:', apiErr.message, apiErr.response || 'No response');
      throw apiErr;
    }
    
    if (!res || !res.data) {
      console.error('API returned empty response');
      throw new Error('Empty response from server');
    }
    
    console.log('API response data type:', typeof res.data);
    console.log('API response data shape:', 
      Array.isArray(res.data) 
        ? `Array with ${res.data.length} items` 
        : (res.data.shipments 
            ? `Object with shipments array (${res.data.shipments.length} items)` 
            : 'Unknown shape')
    );

    // Handle both old and new response formats
    const shipmentsData = res.data.shipments ? res.data.shipments : res.data;
    
    if (!Array.isArray(shipmentsData)) {
      console.error('Data is not an array:', shipmentsData);
      throw new Error('Invalid data format returned from server');
    }
    
    console.log(`Successfully processed ${shipmentsData.length} shipments`);
    
    dispatch({
      type: GET_SHIPMENTS,
      payload: shipmentsData
    });
    
    return shipmentsData;
  } catch (err) {
    console.error('Error in getShipments action:', err);
    
    dispatch({
      type: SHIPMENT_ERROR,
      payload: { 
        msg: err.response?.statusText || 'Server Error', 
        status: err.response?.status || 500,
        error: err.message
      }
    });
    
    throw err;
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