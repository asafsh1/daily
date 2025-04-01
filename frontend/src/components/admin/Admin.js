import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AirlineManager from './AirlineManager';
import axios from '../../utils/axiosConfig';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('airlines');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (activeTab === 'customers') {
      fetchCustomers();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      console.log('Fetching customers...');
      const response = await axios.get('/api/customers');
      console.log('Customer response:', response.data);
      setCustomers(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching customers:', err);
      console.error('Error details:', err.response?.data || err.message);
      toast.error(err.response?.data?.msg || 'Failed to fetch customers');
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching users...');
      const response = await axios.get('/api/users');
      console.log('Users response:', response.data);
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      console.error('Error details:', err.response?.data || err.message);
      toast.error(err.response?.data?.msg || 'Failed to fetch users');
      setLoading(false);
    }
  };

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
              {loading ? (
                <div className="loading">
                  <i className="fas fa-spinner fa-spin"></i>
                  <p>Loading customers...</p>
                </div>
              ) : (
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
                    {customers.length > 0 ? (
                      customers.map(customer => (
                        <tr key={customer._id}>
                          <td>{customer.name}</td>
                          <td>{customer.email}</td>
                          <td>{customer.phone}</td>
                          <td>
                            <span className={`status-badge status-${customer.status || 'active'}`}>
                              {customer.status || 'active'}
                            </span>
                          </td>
                          <td>
                            <button className="btn-icon btn-edit">
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn-icon btn-delete">
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center">
                          <p>No customers found. Add your first customer!</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
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
              {loading ? (
                <div className="loading">
                  <i className="fas fa-spinner fa-spin"></i>
                  <p>Loading users...</p>
                </div>
              ) : (
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
                    {users.length > 0 ? (
                      users.map(user => (
                        <tr key={user._id}>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>{user.role}</td>
                          <td>
                            <span className={`status-badge status-${user.status || 'active'}`}>
                              {user.status || 'active'}
                            </span>
                          </td>
                          <td>
                            <button className="btn-icon btn-edit">
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn-icon btn-delete">
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center">
                          <p>No users found. Add your first user!</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
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

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: #6c757d;
        }

        .loading i {
          font-size: 24px;
          margin-bottom: 10px;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-active {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .status-inactive {
          background: #ffebee;
          color: #c62828;
        }

        .btn-icon {
          padding: 6px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 4px;
          color: #6c757d;
        }

        .btn-edit {
          background: #e3f2fd;
          color: #1976d2;
        }

        .btn-delete {
          background: #ffebee;
          color: #d32f2f;
        }
      `}</style>
    </div>
  );
};

export default Admin; 