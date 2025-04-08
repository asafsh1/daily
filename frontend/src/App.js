import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import setAuthToken from './utils/setAuthToken';
import { loadUser, login } from './actions/auth';

// Components
import Navbar from './components/layout/Navbar';
import Alert from './components/layout/Alert';
import Dashboard from './components/dashboard/Dashboard';
import ShipmentForm from './components/shipments/ShipmentForm';
import Shipments from './components/shipments/Shipments';
import ShipmentDetail from './components/shipments/ShipmentDetail';
import Admin from './components/admin/Admin';
import NotFound from './components/layout/NotFound';

// Quick Login Component
const QuickLogin = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await store.dispatch(login(email, password));
      const state = store.getState();
      
      if (state.auth.isAuthenticated) {
        window.location.href = '/shipments';
      } else {
        alert('Login failed. Please check credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert(`Login error: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">Login</h4>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary w-100"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Debug Component
const AuthDebug = () => {
  const token = localStorage.getItem('token');
  const reduxState = store.getState();
  
  return (
    <div className="container my-4">
      <h2>Authentication Debug</h2>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Local Storage Token</h5>
          <p className="card-text">
            {token ? (
              <>
                <span className="text-success">Token Found: </span>
                <code>{token.substring(0, 20)}...</code>
              </>
            ) : (
              <span className="text-danger">No token in localStorage</span>
            )}
          </p>
        </div>
      </div>
      
      <div className="card mt-3">
        <div className="card-body">
          <h5 className="card-title">Redux Auth State</h5>
          <pre className="card-text bg-light p-3">
            {JSON.stringify(reduxState.auth, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mt-4">
        <button 
          className="btn btn-primary me-2" 
          onClick={() => {
            store.dispatch(loadUser());
          }}
        >
          Reload User
        </button>
        <button 
          className="btn btn-danger me-2" 
          onClick={() => {
            localStorage.removeItem('token');
            window.location.reload();
          }}
        >
          Clear Token
        </button>
        <button 
          className="btn btn-warning" 
          onClick={() => {
            window.location.href = '/';
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

// Check for token and set auth token on initial load
if (localStorage.token) {
  setAuthToken(localStorage.token);
}

const App = () => {
  // Load user data when app initializes
  useEffect(() => {
    store.dispatch(loadUser());
  }, []);

  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <Navbar />
          <Alert />
          <Routes>
            <Route path="/" element={<Navigate to="/shipments" />} />
            <Route path="/login" element={<QuickLogin />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/shipments" element={<Shipments />} />
            <Route path="/add-shipment" element={<ShipmentForm />} />
            <Route path="/edit-shipment/:id" element={<ShipmentForm />} />
            <Route path="/shipments/:id" element={<ShipmentDetail />} />
            <Route path="/admin/*" element={<Admin />} />
            <Route path="/auth-debug" element={<AuthDebug />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ToastContainer />
        </div>
      </Router>
    </Provider>
  );
};

export default App; 