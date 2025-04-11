import React from 'react';

const TestComponent = () => {
  console.log('TestComponent rendered');
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f0f0f0', 
      border: '1px solid #ccc',
      margin: '20px'
    }}>
      <h1>Test Component</h1>
      <p>If you can see this, the React app is rendering correctly.</p>
      <p>API URL: {process.env.REACT_APP_API_URL}</p>
      <p>Environment: {process.env.NODE_ENV}</p>
    </div>
  );
};

export default TestComponent; 