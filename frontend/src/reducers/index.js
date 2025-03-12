import { combineReducers } from 'redux';
import alert from './alert';
import auth from './auth';
import shipment from './shipment';
import dashboard from './dashboard';

export default combineReducers({
  alert,
  auth,
  shipment,
  dashboard
}); 