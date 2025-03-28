import React from 'react';
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
import NotFound from './components/layout/NotFound';

const App = () => {
  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <Navbar />
          <Alert />
          <Routes>
            <Route path="/" element={<Navigate to="/shipments" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/shipments" element={<Shipments />} />
            <Route path="/add-shipment" element={<ShipmentForm />} />
            <Route path="/edit-shipment/:id" element={<ShipmentForm />} />
            <Route path="/shipments/:id" element={<ShipmentDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ToastContainer />
        </div>
      </Router>
    </Provider>
  );
};

export default App; 