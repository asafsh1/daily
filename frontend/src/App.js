// App.js - Updated for database connectivity fix - forcing a new build

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setUser, logout } from './actions/authActions';
import LoadingSpinner from './components/layout/LoadingSpinner';

// Components
import Navbar from './components/layout/Navbar';
import Alert from './components/layout/Alert';
import Dashboard from './components/dashboard/Dashboard';
import ShipmentForm from './components/shipments/ShipmentForm';
import Shipments from './components/shipments/Shipments';
import ShipmentDetail from './components/shipments/ShipmentDetail';
import Admin from './components/admin/Admin';
import NotFound from './components/layout/NotFound';

const App = () => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to verify session with the backend
        const response = await axios.get('/api/auth/verify');
        dispatch(setUser(response.data));
        setIsLoading(false);
      } catch (error) {
        console.log('Session not found or invalid');
        dispatch(logout());
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [dispatch]);

  // Show loading state while checking authentication
  if (isLoading) {
    return <LoadingSpinner />;
  }

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