import React, { useEffect, useState } from 'react';
import axios from '../../utils/axiosConfig';

const TestComponent = () => {
  const [apiStatus, setApiStatus] = useState('Testing...');
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const testApiConnection = async () => {
      try {
        const response = await axios.get('/api/dashboard/public-diagnostics');
        console.log('API connection test result:', response.data);
        setApiStatus('Connected to API successfully');
      } catch (err) {
        console.error('API connection test failed:', err);
        setError(err.message || 'Unknown error');
        setApiStatus('Failed to connect to API');
      }
    };
    
    testApiConnection();
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f0f0f0', 
      border: '1px solid #ccc',
      margin: '20px'
    }}>
      <h1>Test Component</h1>
      <p>If you can see this, the React app is rendering correctly.</p>
      <p>API URL: {process.env.REACT_APP_API_URL || 'Not set'}</p>
      <p>Environment: {process.env.NODE_ENV || 'Not set'}</p>
      <div>
        <h3>API Connection Status:</h3>
        <p>{apiStatus}</p>
        {error && (
          <div style={{ color: 'red' }}>
            <p>Error: {error}</p>
          </div>
        )}
      </div>
      <div>
        <h3>Browser Info:</h3>
        <p>UserAgent: {navigator.userAgent}</p>
      </div>
    </div>
  );
};

export default TestComponent; 