import axios from '../utils/axiosConfig';
import { setAlert } from './alert';
import {
  REGISTER_SUCCESS,
  REGISTER_FAIL,
  USER_LOADED,
  AUTH_ERROR,
  LOGIN_SUCCESS,
  LOGIN_FAIL,
  LOGOUT
} from './types';
import setAuthToken from '../utils/setAuthToken';

// Load User
export const loadUser = () => async dispatch => {
  try {
    console.log('Loading user...'); // Debug log
    if (localStorage.token) {
      console.log('Token found in localStorage'); // Debug log
      setAuthToken(localStorage.token);
    } else {
      console.log('No token found in localStorage'); // Debug log
      dispatch({ type: AUTH_ERROR });
      return;
    }

    const res = await axios.get('/api/auth');
    console.log('User loaded successfully:', res.data); // Debug log

    dispatch({
      type: USER_LOADED,
      payload: res.data
    });
  } catch (err) {
    console.error('Error loading user:', err); // Debug log
    dispatch({
      type: AUTH_ERROR
    });
  }
};

// Register User
export const register = ({ name, email, password, role }) => async dispatch => {
  const config = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const body = JSON.stringify({ name, email, password, role });

  try {
    const res = await axios.post('/api/users', body, config);

    dispatch({
      type: REGISTER_SUCCESS,
      payload: res.data
    });

    dispatch(loadUser());
  } catch (err) {
    const errors = err.response.data.errors;

    if (errors) {
      errors.forEach(error => dispatch(setAlert(error.msg, 'danger')));
    }

    dispatch({
      type: REGISTER_FAIL
    });
  }
};

// Login User
export const login = (email, password) => async dispatch => {
  try {
    console.log('Attempting login...'); // Debug log
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const body = JSON.stringify({ email, password });
    const res = await axios.post('/api/auth', body, config);
    console.log('Login successful:', res.data); // Debug log

    dispatch({
      type: LOGIN_SUCCESS,
      payload: res.data
    });

    dispatch(loadUser());
  } catch (err) {
    console.error('Login error:', err); // Debug log
    const errors = err.response?.data?.errors;

    if (errors) {
      errors.forEach(error => dispatch(setAlert(error.msg, 'danger')));
    }

    dispatch({
      type: LOGIN_FAIL
    });
  }
};

// Logout
export const logout = () => dispatch => {
  dispatch({ type: LOGOUT });
}; 