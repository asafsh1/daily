// App.js - Updated for database connectivity fix - forcing a new build

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { useSelector } from 'react-redux';
import store from './store';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { loadUser } from './actions/authActions';

// Components
import Navbar from './components/layout/Navbar';
import Alert from './components/layout/Alert';
import Dashboard from './components/dashboard/Dashboard';
import ShipmentForm from './components/shipments/ShipmentForm';
import Shipments from './components/shipments/Shipments';
import ShipmentDetail from './components/shipments/ShipmentDetail';
import Admin from './components/admin/Admin';
import NotFound from './components/layout/NotFound';
import Login from './components/auth/Login';
import LoadingSpinner from './components/layout/LoadingSpinner';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSelector(state => state.auth);
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

const App = () => {
  useEffect(() => {
    store.dispatch(loadUser());
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
            <Route 
              path="/login" 
              element={
                <Login />
              } 
            />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/shipments" 
              element={
                <ProtectedRoute>
                  <Shipments />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/shipment/:id" 
              element={
                <ProtectedRoute>
                  <ShipmentDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/add-shipment" 
              element={
                <ProtectedRoute>
                  <ShipmentForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/edit-shipment/:id" 
              element={
                <ProtectedRoute>
                  <ShipmentForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </Provider>
  );
};

export default App; 