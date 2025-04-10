// App.js - Updated for database connectivity fix - forcing a new build

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppRoutes from './AppRoutes';

const App = () => {
  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <ToastContainer 
            position="top-right"
            autoClose={5000} 
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            pauseOnHover
          />
          <AppRoutes />
        </div>
      </Router>
    </Provider>
  );
};

export default App; 