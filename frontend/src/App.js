import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import { loadUser } from './actions/auth';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Navbar from './components/layout/Navbar';
import Alert from './components/layout/Alert';
import Dashboard from './components/dashboard/Dashboard';
import ShipmentForm from './components/shipments/ShipmentForm';
import Shipments from './components/shipments/Shipments';
import ShipmentDetail from './components/shipments/ShipmentDetail';
import PrivateRoute from './components/routing/PrivateRoute';
import NotFound from './components/layout/NotFound';

// Load user on app initialization
store.dispatch(loadUser());

const App = () => {
  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <Navbar />
          <Alert />
          <Routes>
            {/* Redirect from root to shipments */}
            <Route path="/" element={<Navigate to="/shipments" />} />
            <Route
              path="/dashboard"
              element={<PrivateRoute component={Dashboard} />}
            />
            <Route
              path="/shipments"
              element={<PrivateRoute component={Shipments} />}
            />
            <Route
              path="/shipments/:id"
              element={<PrivateRoute component={ShipmentDetail} />}
            />
            <Route
              path="/add-shipment"
              element={<PrivateRoute component={ShipmentForm} />}
            />
            <Route
              path="/edit-shipment/:id"
              element={<PrivateRoute component={ShipmentForm} />}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ToastContainer position="bottom-right" />
        </div>
      </Router>
    </Provider>
  );
};

export default App; 