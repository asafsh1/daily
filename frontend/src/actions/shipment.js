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

// Set shipments loading state
export const setShipmentsLoading = () => dispatch => {
  dispatch({ type: SHIPMENTS_LOADING });
};

// Get all shipments
export const getShipments = () => async (dispatch) => {
  try {
    dispatch(setShipmentsLoading());
    console.log('Calling API to get shipments...');
    
    // No longer requiring authentication token
    const res = await axios.get('/api/shipments');
    
    // Debug the API response
    console.log('API response for shipments:', res.data);
    
    // Ensure we're getting an array of shipments
    let shipmentsArray = [];
    
    if (Array.isArray(res.data)) {
      shipmentsArray = res.data;
    } else if (res.data && Array.isArray(res.data.shipments)) {
      shipmentsArray = res.data.shipments;
    } else if (res.data && typeof res.data === 'object') {
      // If it's an object but not an array, wrap it in an array
      shipmentsArray = [res.data];
    }
    
    console.log(`Processed ${shipmentsArray.length} shipments`);
    
    dispatch({
      type: GET_SHIPMENTS,
      payload: shipmentsArray
    });
    
    return shipmentsArray;
  } catch (err) {
    console.error('Error fetching shipments:', err);
    let errorMsg = 'Failed to fetch shipments';
    let statusCode = 500;
    
    if (err.response) {
      errorMsg = err.response.data?.msg || 'Server returned an error';
      statusCode = err.response.status;
      console.error(`Server error ${statusCode}: ${errorMsg}`);
    } else if (err.request) {
      errorMsg = 'No response received from server';
      console.error('No response from server:', err.request);
    } else {
      errorMsg = err.message || 'Unknown error occurred';
    }
    
    dispatch({
      type: SHIPMENT_ERROR,
      payload: { msg: errorMsg, status: statusCode }
    });
    
    throw err;
  }
};

// Get single shipment by ID
export const getShipment = (id) => async (dispatch) => {
  try {
    dispatch(setShipmentsLoading());
    
    if (!id) {
      throw new Error('Shipment ID is required');
    }
    
    const res = await axios.get(`/api/shipments/${id}`);
    
    // Log the shipment for debugging
    console.log('Fetched shipment details:', res.data);
    
    // Make sure legs array exists
    const shipment = res.data;
    if (!shipment.legs) {
      shipment.legs = [];
    }
    
    dispatch({
      type: GET_SHIPMENT,
      payload: shipment
    });
    
    return shipment;
  } catch (err) {
    console.error('Error fetching shipment:', err);
    
    dispatch({
      type: SHIPMENT_ERROR,
      payload: { msg: err.response?.data?.msg || 'Failed to fetch shipment', status: err.response?.status }
    });
    
    throw err;
  }
};

// Add shipment
export const addShipment = (formData, navigate) => async (dispatch) => {
  try {
    console.log('Creating new shipment with data:', formData);
    
    // Ensure required fields are provided with defaults if missing
    const shipmentData = {
      ...formData,
      shipperName: formData.shipperName || 'Unknown',
      consigneeName: formData.consigneeName || 'Unknown',
      customer: formData.customer || 'N/A'
    };
    
    const res = await axios.post('/api/shipments', shipmentData);
    console.log('Shipment creation response:', res.data);

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
    console.error('Error creating shipment:', err);
    
    // Handle various error types
    if (err.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Server Error Response:', err.response.data);
      
      const errors = err.response.data.errors;
      if (errors) {
        errors.forEach((error) => dispatch(setAlert(error.msg, 'danger')));
      } else if (err.response.data.msg) {
        dispatch(setAlert(err.response.data.msg, 'danger'));
      } else {
        dispatch(setAlert('Failed to create shipment', 'danger'));
      }

      dispatch({
        type: SHIPMENT_ERROR,
        payload: { 
          msg: err.response.data.msg || 'Server error', 
          status: err.response.status,
          errors: err.response.data.errors || []
        }
      });
    } else if (err.request) {
      // The request was made but no response was received
      console.error('No response received from server:', err.request);
      dispatch(setAlert('Server not responding, please try again later', 'danger'));
      
      dispatch({
        type: SHIPMENT_ERROR,
        payload: { msg: 'No response from server', status: 'network-error' }
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', err.message);
      dispatch(setAlert('Application error, please try again', 'danger'));
      
      dispatch({
        type: SHIPMENT_ERROR,
        payload: { msg: err.message, status: 'request-setup-error' }
      });
    }
    
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