import {
  USER_LOADED,
  AUTH_ERROR,
  LOGIN_SUCCESS,
  LOGIN_FAIL,
  LOGOUT
} from '../actions/types';

const initialState = {
  isAuthenticated: false,
  loading: true,
  user: null,
  error: null
};

export default function(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case USER_LOADED:
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: payload,
        error: null
      };
    case LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: payload,
        error: null
      };
    case AUTH_ERROR:
    case LOGIN_FAIL:
      return {
        ...state,
        isAuthenticated: false,
        loading: false,
        user: null,
        error: payload
      };
    case LOGOUT:
      return {
        ...state,
        isAuthenticated: false,
        loading: false,
        user: null,
        error: null
      };
    default:
      return state;
  }
} 