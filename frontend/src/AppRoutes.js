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
          const response = await axios.post('/api/get-dev-token');
          localStorage.setItem('token', response.data.token);
        } catch (err) {
          console.error('Failed to get initial token:', err);
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
        <Route path="/shipment/:id" element={<ShipmentDetail />} />
        <Route path="/add-shipment" element={<ShipmentForm />} />
        <Route path="/edit-shipment/:id" element={<ShipmentForm />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default AppRoutes; 