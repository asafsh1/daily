import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import axios from './utils/axiosConfig';

// Components
import Navbar from './components/layout/Navbar';
import Alert from './components/layout/Alert';
import Dashboard from './components/dashboard/Dashboard';
import ShipmentForm from './components/shipments/ShipmentForm';
import Shipments from './components/shipments/Shipments';
import ShipmentDetail from './components/shipments/ShipmentDetail';
import Admin from './components/admin/Admin';
import NotFound from './components/layout/NotFound';
import TestComponent from './components/layout/TestComponent';

const AppRoutes = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Try to get a dev token on initial load if none exists
    const getInitialToken = async () => {
      if (!localStorage.getItem('token')) {
        try {
          // First try the get-dev-token endpoint with GET method
          try {
            const response = await axios.get('/api/auth/get-dev-token');
            if (response.data && response.data.token) {
              console.log('Got token from auth/get-dev-token (GET)');
              localStorage.setItem('token', response.data.token);
              return;
            }
          } catch (err) {
            console.log('Failed to get token with GET, trying POST...');
            try {
              const postResponse = await axios.post('/api/auth/get-dev-token');
              if (postResponse.data && postResponse.data.token) {
                console.log('Got token from auth/get-dev-token (POST)');
                localStorage.setItem('token', postResponse.data.token);
                return;
              }
            } catch (postErr) {
              console.log('Failed to get token from auth/get-dev-token, trying public-diagnostics');
            }
          }
          
          // If that fails, try the public-diagnostics endpoint
          const diagResponse = await axios.get('/api/dashboard/public-diagnostics');
          if (diagResponse.data && diagResponse.data.auth && diagResponse.data.auth.devToken) {
            console.log('Got token from public-diagnostics');
            localStorage.setItem('token', diagResponse.data.auth.devToken);
          }
        } catch (err) {
          console.error('Failed to get initial token:', err);
          // Clear any existing tokens as they might be invalid
          localStorage.removeItem('token');
        }
      }
    };
    getInitialToken();
  }, []);

  return (
    <>
      <Navbar />
      <Alert />
      <TestComponent />
      <Routes>
        <Route path="/" element={<Navigate to="/shipments" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/shipments" element={<Shipments />} />
        <Route path="/shipments/:id" element={<ShipmentDetail />} />
        <Route path="/add-shipment" element={<ShipmentForm />} />
        <Route path="/edit-shipment/:id" element={<ShipmentForm />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default AppRoutes; 