import React, { useState } from 'react';
import AirlineManager from './AirlineManager';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('airlines');

  const renderContent = () => {
    switch (activeTab) {
      case 'airlines':
        return <AirlineManager />;
      case 'customers':
        return <div>Customer Management (Coming Soon)</div>;
      case 'users':
        return <div>User Management (Coming Soon)</div>;
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'airlines' ? 'active' : ''}`}
          onClick={() => setActiveTab('airlines')}
        >
          Airlines
        </button>
        <button
          className={`tab-button ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          Customers
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
      </div>

      <div className="admin-content">
        {renderContent()}
      </div>

      <style jsx>{`
        .admin-panel {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .admin-header {
          margin-bottom: 20px;
        }

        .admin-header h1 {
          color: #2c3e50;
          font-size: 24px;
        }

        .admin-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
        }

        .tab-button {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          background: none;
          cursor: pointer;
          font-size: 16px;
          color: #6c757d;
          transition: all 0.2s;
        }

        .tab-button:hover {
          color: #007bff;
        }

        .tab-button.active {
          color: #007bff;
          font-weight: bold;
          border-bottom: 2px solid #007bff;
        }

        .admin-content {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default Admin; 