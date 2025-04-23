import React, { useEffect, useState } from 'react';
import axios from '../../utils/axiosConfig';

const TestComponent = () => {
  const [apiStatus, setApiStatus] = useState('Testing...');
  const [error, setError] = useState(null);
  const [createResponse, setCreateResponse] = useState(null);
  
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

  const testCreateShipment = async () => {
    try {
      setApiStatus('Testing shipment creation...');
      
      // Create a test shipment with minimal data
      const testShipment = {
        reference: `Test-${new Date().getTime()}`,
        origin: 'Test Origin',
        destination: 'Test Destination',
        carrier: 'Test Carrier',
        shipperName: 'Test Shipper',
        consigneeName: 'Test Consignee',
        status: 'Testing',
        orderStatus: 'planned',
        shipmentStatus: 'Pending'
      };
      
      // Call the API to create the shipment
      const response = await axios.post('/api/shipments', testShipment);
      console.log('Shipment creation test result:', response.data);
      
      setCreateResponse({
        success: true, 
        message: 'Shipment created successfully!',
        id: response.data._id,
        data: response.data
      });
      
      setApiStatus('Shipment created successfully');
    } catch (err) {
      console.error('Shipment creation test failed:', err);
      setError(err.message || 'Unknown error');
      setApiStatus('Failed to create shipment');
      
      setCreateResponse({
        success: false,
        message: `Error: ${err.message || 'Unknown error'}`,
        error: err.response?.data || err.message
      });
    }
  };

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
      
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={testCreateShipment} 
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Create Shipment
        </button>
        
        {createResponse && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: createResponse.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${createResponse.success ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px'
          }}>
            <p><strong>{createResponse.message}</strong></p>
            {createResponse.success && (
              <div>
                <p>Shipment ID: {createResponse.id}</p>
                <pre style={{ maxHeight: '150px', overflow: 'auto' }}>
                  {JSON.stringify(createResponse.data, null, 2)}
                </pre>
              </div>
            )}
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