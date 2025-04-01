import React, { useState } from 'react';
import CustomerManager from './CustomerManager';
import AirlineManager from './AirlineManager';
import UserManager from './UserManager';
import { toast } from 'react-toastify';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('customers');
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'customers', label: 'Customers', icon: 'fas fa-users' },
    { id: 'airlines', label: 'Airlines', icon: 'fas fa-plane' },
    { id: 'users', label: 'Users', icon: 'fas fa-user-cog' },
    { id: 'settings', label: 'Settings', icon: 'fas fa-cog' }
  ];

  return (
    <div className="admin-panel">
      <style>
        {`
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
          .admin-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          .stat-title {
            color: #6c757d;
            font-size: 14px;
            margin-bottom: 8px;
          }
          .stat-value {
            color: #2c3e50;
            font-size: 24px;
            font-weight: 600;
          }
        `}
      </style>

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
        {activeTab === 'customers' && <CustomerManager />}
        {activeTab === 'airlines' && <AirlineManager />}
        {activeTab === 'users' && <UserManager />}
        {activeTab === 'settings' && (
          <div className="settings-panel">
            <h2>System Settings</h2>
            <div className="settings-grid">
              <div className="setting-card">
                <h3>Email Settings</h3>
                <p>Configure email notifications and templates</p>
                <button className="btn btn-primary">Configure</button>
              </div>
              <div className="setting-card">
                <h3>Tracking Settings</h3>
                <p>Manage tracking providers and configurations</p>
                <button className="btn btn-primary">Configure</button>
              </div>
              <div className="setting-card">
                <h3>Notification Settings</h3>
                <p>Set up system notifications and alerts</p>
                <button className="btn btn-primary">Configure</button>
              </div>
              <div className="setting-card">
                <h3>System Backup</h3>
                <p>Manage system backups and restore points</p>
                <button className="btn btn-primary">Configure</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin; 