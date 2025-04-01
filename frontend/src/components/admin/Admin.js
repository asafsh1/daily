import React, { useState } from 'react';
import AirlineManager from './AirlineManager';
import { toast } from 'react-toastify';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('airlines');
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'airlines', label: 'Airlines', icon: 'fas fa-plane' },
    { id: 'customers', label: 'Customers', icon: 'fas fa-users' },
    { id: 'users', label: 'Users', icon: 'fas fa-user-cog' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'airlines':
        return <AirlineManager />;
      case 'customers':
        return (
          <div className="coming-soon">
            <i className="fas fa-tools"></i>
            <h2>Customer Management</h2>
            <p>This feature is coming soon!</p>
          </div>
        );
      case 'users':
        return (
          <div className="coming-soon">
            <i className="fas fa-tools"></i>
            <h2>User Management</h2>
            <p>This feature is coming soon!</p>
          </div>
        );
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1 className="admin-title">Admin Panel</h1>
        <p className="admin-subtitle">Manage your system settings and users</p>
      </div>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={tab.icon}></i>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-content">
        {renderContent()}
      </div>

      <style jsx>{`
        .admin-panel {
          padding: 20px;
          background: #f8f9fa;
          min-height: calc(100vh - 60px);
        }

        .admin-header {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e9ecef;
        }

        .admin-title {
          color: #2c3e50;
          font-size: 24px;
          margin-bottom: 10px;
        }

        .admin-subtitle {
          color: #6c757d;
          font-size: 16px;
        }

        .admin-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }

        .admin-tab {
          padding: 12px 24px;
          border: none;
          background: #fff;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #495057;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
        }

        .admin-tab:hover {
          background: #f1f3f5;
          transform: translateY(-1px);
        }

        .admin-tab.active {
          background: #0d6efd;
          color: white;
        }

        .admin-tab i {
          font-size: 16px;
        }

        .admin-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .coming-soon {
          text-align: center;
          padding: 40px;
          color: #6c757d;
        }

        .coming-soon i {
          font-size: 48px;
          margin-bottom: 20px;
          color: #adb5bd;
        }

        .coming-soon h2 {
          color: #2c3e50;
          margin-bottom: 10px;
        }

        .coming-soon p {
          font-size: 16px;
        }
      `}</style>
    </div>
  );
};

export default Admin; 