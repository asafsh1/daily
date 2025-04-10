// App.js - Updated for database connectivity fix - forcing a new build

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Navbar from './components/layout/Navbar';
import Alert from './components/layout/Alert';
import Dashboard from './components/dashboard/Dashboard';
import ShipmentForm from './components/shipments/ShipmentForm';
import Shipments from './components/shipments/Shipments';
import ShipmentDetail from './components/shipments/ShipmentDetail';
import Admin from './components/admin/Admin';
import NotFound from './components/layout/NotFound';

// Set up authentication token
const initializeAuth = () => {
  // Only set a default token if none exists already
  if (!localStorage.getItem('token')) {
    const defaultToken = 'default-dev-token';
    localStorage.setItem('token', defaultToken);
    console.log('Set default token for authentication:', defaultToken);
  } else {
    console.log('Using existing token from localStorage');
  }
};

const App = () => {
  useEffect(() => {
    // Initialize authentication when the app loads
    initializeAuth();
  }, []);

  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <Navbar />
          <ToastContainer 
            position="top-right"
            autoClose={5000} 
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            pauseOnHover
          />
          <Alert />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/shipments" element={<Shipments />} />
            <Route path="/shipment/:id" element={<ShipmentDetail />} />
            <Route path="/add-shipment" element={<ShipmentForm />} />
            <Route path="/edit-shipment/:id" element={<ShipmentForm />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </Provider>
  );
};

export default App; 