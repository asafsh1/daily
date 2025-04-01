import React, { useState } from 'react';
import { toast } from 'react-toastify';
import AirlineManager from './AirlineManager';
import axios from '../../utils/axiosConfig';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('airlines');
  const [loading, setLoading] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'airlines':
        return <AirlineManager />;
      case 'customers':
        return (
          <div className="customer-manager">
            <div className="customer-header">
              <h2 className="customer-title">Customer Management</h2>
              <div className="customer-actions">
                <button className="btn btn-success">
                  <i className="fas fa-file-export"></i> Export CSV
                </button>
                <label className="btn btn-secondary">
                  <i className="fas fa-file-import"></i> Import CSV
                  <input type="file" className="file-input" accept=".csv" />
                </label>
                <button className="btn btn-primary">
                  <i className="fas fa-plus"></i> Add Customer
                </button>
              </div>
            </div>
            <div className="customer-list">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="5" className="text-center">
                      <p>Customer management is coming soon!</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'users':
        return (
          <div className="user-manager">
            <div className="user-header">
              <h2 className="user-title">User Management</h2>
              <div className="user-actions">
                <button className="btn btn-success">
                  <i className="fas fa-file-export"></i> Export CSV
                </button>
                <label className="btn btn-secondary">
                  <i className="fas fa-file-import"></i> Import CSV
                  <input type="file" className="file-input" accept=".csv" />
                </label>
                <button className="btn btn-primary">
                  <i className="fas fa-plus"></i> Add User
                </button>
              </div>
            </div>
            <div className="user-list">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="5" className="text-center">
                      <p>User management is coming soon!</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return null;
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
          margin-bottom: 30px;
        }

        .admin-header h1 {
          color: #2c3e50;
          font-size: 24px;
          margin: 0;
        }

        .admin-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          border-bottom: 1px solid #dee2e6;
          padding-bottom: 10px;
        }

        .tab-button {
          padding: 8px 16px;
          border: none;
          background: none;
          color: #6c757d;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .tab-button:hover {
          color: #0d6efd;
        }

        .tab-button.active {
          color: #0d6efd;
          border-bottom: 2px solid #0d6efd;
        }

        .admin-content {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .customer-manager,
        .user-manager {
          padding: 20px;
        }

        .customer-header,
        .user-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .customer-title,
        .user-title {
          color: #2c3e50;
          font-size: 20px;
          margin: 0;
        }

        .customer-actions,
        .user-actions {
          display: flex;
          gap: 10px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-primary {
          background: #0d6efd;
          color: white;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-success {
          background: #198754;
          color: white;
        }

        .customer-list table,
        .user-list table {
          width: 100%;
          border-collapse: collapse;
        }

        .customer-list th,
        .customer-list td,
        .user-list th,
        .user-list td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }

        .customer-list th,
        .user-list th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #495057;
        }

        .text-center {
          text-align: center;
          padding: 40px;
          color: #6c757d;
        }

        .file-input {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default Admin; 