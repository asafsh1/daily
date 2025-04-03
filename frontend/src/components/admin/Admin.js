import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AirlineManager from './AirlineManager';
import CustomerForm from './CustomerForm';
import UserForm from './UserForm';
import { generateUniqueId, ID_PREFIXES } from '../../utils/idGenerator';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('airlines');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    if (activeTab === 'customers') {
      fetchCustomers();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Force data reload on tab change
    if (tab === 'customers') {
      setLoading(true);
      setTimeout(() => fetchCustomers(), 100);
    } else if (tab === 'users') {
      setLoading(true);
      setTimeout(() => fetchUsers(), 100);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      console.log('Direct API test: Fetching customers...');
      
      // Try using the direct fetch API to see if that works better
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/customers`, {
        headers: {
          'x-auth-token': localStorage.getItem('token') || 'default-dev-token'
        }
      });
      const data = await response.json();
      console.log('Direct API test results for customers:', data);
      
      if (Array.isArray(data)) {
        setCustomers(data);
      } else {
        console.error('Received non-array data:', data);
        toast.error('Received invalid data format from server');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching customers:', err);
      console.error('Error details:', err);
      
      // Set empty array instead of leaving old data
      setCustomers([]);
      
      toast.error('Failed to fetch customers');
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Direct API test: Fetching users...');
      
      // Try using the direct fetch API to see if that works better
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/users`, {
        headers: {
          'x-auth-token': localStorage.getItem('token') || 'default-dev-token'
        }
      });
      const data = await response.json();
      console.log('Direct API test results for users:', data);
      
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error('Received non-array data:', data);
        toast.error('Received invalid data format from server');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      console.error('Error details:', err);
      
      // Set empty array instead of leaving old data
      setUsers([]);
      
      toast.error('Failed to fetch users');
      setLoading(false);
    }
  };

  const handleEditCustomer = async (customer) => {
    try {
      console.log('Editing customer:', customer);
      // Make sure we're using the right property names
      const customerToEdit = {
        _id: customer._id,
        companyName: customer.companyName || customer.name,
        contactName: customer.contactName || customer.contactPerson,
        email: customer.email,
        phone: customer.phone || '',
        awbInstructions: customer.awbInstructions || customer.notes || ''
      };
      
      console.log('Prepared customer data for edit:', customerToEdit);
      setEditingCustomer(customerToEdit);
      setShowCustomerForm(true);
    } catch (err) {
      console.error('Error preparing customer edit:', err);
      toast.error('Failed to prepare customer edit');
    }
  };

  const handleUpdateCustomer = async (customerData) => {
    try {
      console.log('Updating customer:', customerData);
      
      // Ensure empty phone number is properly handled
      const updateData = {
        ...customerData,
        phone: customerData.phone || null  // Convert empty string to null
      };
      
      // Proceed with update
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/customers/${editingCustomer._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token') || 'default-dev-token',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
      }
      
      const updatedCustomer = await response.json();
      console.log('Updated customer response:', updatedCustomer);
      
      // Update the local state
      setCustomers(customers.map(c => c._id === updatedCustomer._id ? updatedCustomer : c));
      
      // Clear form and show success message
      setEditingCustomer(null);
      setShowCustomerForm(false);
      toast.success('Customer updated successfully');
      
      // Force a complete reload of all customers
      fetchCustomers();
    } catch (err) {
      console.error('Error updating customer:', err);
      toast.error(err.message || 'Failed to update customer');
    }
  };

  const handleAddCustomer = async (customerData) => {
    try {
      console.log('Adding customer:', customerData);
      
      // Generate a unique ID for the customer
      const customerWithId = {
        ...customerData,
        customerId: generateUniqueId(ID_PREFIXES.CUSTOMER)
      };
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token') || 'default-dev-token'
        },
        body: JSON.stringify(customerWithId)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
      }
      
      const newCustomer = await response.json();
      console.log('Added customer:', newCustomer);
      
      setCustomers([...customers, newCustomer]);
      setShowCustomerForm(false);
      toast.success('Customer added successfully');
    } catch (err) {
      console.error('Error adding customer:', err);
      toast.error(err.message || 'Failed to add customer');
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/customers/${id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': localStorage.getItem('token') || 'default-dev-token'
        }
      });
      
      if (response.ok) {
        // Update the local state immediately
        setCustomers(customers.filter(customer => customer._id !== id));
        toast.success('Customer deleted successfully');
        
        // Then force a complete reload to ensure we have the latest data
        fetchCustomers();
      } else {
        const errorData = await response.json();
        toast.error(errorData.msg || 'Failed to delete customer');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error deleting customer:', err);
      toast.error('Failed to delete customer');
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    try {
      console.log('Editing user:', user);
      // Make sure we're using the right property names
      const userToEdit = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user'
      };
      
      console.log('Prepared user data for edit:', userToEdit);
      setEditingUser(userToEdit);
      setShowUserForm(true);
    } catch (err) {
      console.error('Error preparing user edit:', err);
      toast.error('Failed to prepare user edit');
    }
  };

  const handleUpdateUser = async (userData) => {
    try {
      console.log('Updating user:', userData);
      
      // Proceed with update
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token') || 'default-dev-token',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
      }
      
      const updatedUser = await response.json();
      console.log('Updated user response:', updatedUser);
      
      // Clear form and show success message
      setEditingUser(null);
      setShowUserForm(false);
      toast.success('User updated successfully');
      
      // Force a complete reload of all users
      setLoading(true);
      try {
        const reloadResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/users`, {
          headers: {
            'x-auth-token': localStorage.getItem('token') || 'default-dev-token',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (reloadResponse.ok) {
          const freshData = await reloadResponse.json();
          console.log('Refreshed user data:', freshData);
          if (Array.isArray(freshData)) {
            setUsers(freshData);
          }
        }
      } catch (reloadErr) {
        console.error('Error reloading users after update:', reloadErr);
      } finally {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error updating user:', err);
      toast.error(err.message || 'Failed to update user');
    }
  };
  
  const handleAddUser = async (userData) => {
    try {
      console.log('Adding user:', userData);
      
      // Generate a random password for new users
      const password = Array(10).fill('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*')
        .map(x => x[Math.floor(Math.random() * x.length)]).join('');
      
      // Ensure the user has a unique ID
      const userDataWithPasswordAndId = {
        ...userData,
        password,
        userId: userData.userId || generateUniqueId(ID_PREFIXES.USER)
      };
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token') || 'default-dev-token'
        },
        body: JSON.stringify(userDataWithPasswordAndId)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
      }
      
      const newUser = await response.json();
      console.log('Added user:', newUser);
      
      setUsers([...users, newUser]);
      setShowUserForm(false);
      toast.success('User added successfully');
    } catch (err) {
      console.error('Error adding user:', err);
      toast.error(err.message || 'Failed to add user');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': localStorage.getItem('token') || 'default-dev-token'
        }
      });
      
      if (response.ok) {
        setUsers(users.filter(user => user._id !== id));
        toast.success('User deleted successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.msg || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'airlines':
        return <AirlineManager />;
      case 'customers':
        return (
          <div className="customer-section">
            <div className="section-header">
              <h2>Customer Management</h2>
              <button className="btn-add" onClick={() => { setEditingCustomer(null); setShowCustomerForm(true); }}>
                <i className="fas fa-plus"></i> Add Customer
              </button>
            </div>
            
            {showCustomerForm ? (
              <CustomerForm 
                onSubmit={editingCustomer ? handleUpdateCustomer : handleAddCustomer}
                onCancel={() => setShowCustomerForm(false)}
                initialData={editingCustomer}
              />
            ) : null}
            
            {loading ? (
              <div className="loading">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading customers...</p>
              </div>
            ) : (
              <div className="customer-list">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Company Name</th>
                      <th>Contact Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>AWB Instructions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length > 0 ? (
                      customers.map(customer => (
                        <tr key={customer._id}>
                          <td>{customer.customerId || `CUST-${customer._id.substring(0, 6)}`}</td>
                          <td>{customer.companyName || customer.name}</td>
                          <td>{customer.contactName || customer.contactPerson}</td>
                          <td>{customer.email}</td>
                          <td>{customer.phone || '-'}</td>
                          <td>{customer.awbInstructions || customer.notes || '-'}</td>
                          <td>
                            <button
                              className="btn-icon btn-edit"
                              onClick={() => handleEditCustomer(customer)}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn-icon btn-delete"
                              onClick={() => handleDeleteCustomer(customer._id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center">
                          <p>No customers found. Add your first customer!</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'users':
        return (
          <div className="user-section">
            <div className="section-header">
              <h2>User Management</h2>
              <button className="btn-add" onClick={() => { setEditingUser(null); setShowUserForm(true); }}>
                <i className="fas fa-plus"></i> Add User
              </button>
            </div>
            
            {showUserForm && (
              <UserForm 
                onSubmit={editingUser ? handleUpdateUser : handleAddUser}
                onCancel={() => setShowUserForm(false)}
                initialData={editingUser}
              />
            )}
            
            {loading ? (
              <div className="loading">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading users...</p>
              </div>
            ) : (
              <div className="user-list">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? (
                      users.map(user => (
                        <tr key={user._id}>
                          <td>{user.userId || `USR-${user._id?.substring(0, 8) || 'N/A'}`}</td>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>{user.role || 'user'}</td>
                          <td>
                            <button
                              className="btn-icon btn-edit"
                              onClick={() => handleEditUser(user)}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn-icon btn-delete"
                              onClick={() => handleDeleteUser(user._id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center">
                          <p>No users found. Add your first user!</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      default:
        return <p>Select a tab</p>;
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
          onClick={() => handleTabChange('airlines')}
        >
          Airlines
        </button>
        <button
          className={`tab-button ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => handleTabChange('customers')}
        >
          Customers
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => handleTabChange('users')}
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
          flex-wrap: wrap;
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
          flex: 1;
          min-width: 100px;
          text-align: center;
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
          overflow-x: auto;
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
          flex-wrap: wrap;
          gap: 10px;
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
          flex-wrap: wrap;
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
          white-space: nowrap;
        }

        .customer-list table,
        .user-list table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px;
        }

        .customer-list th,
        .customer-list td,
        .user-list th,
        .user-list td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }

        .text-center {
          text-align: center;
          padding: 40px;
          color: #6c757d;
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

        @media (max-width: 768px) {
          .admin-panel {
            padding: 10px;
          }

          .admin-tabs {
            flex-direction: column;
            gap: 5px;
          }

          .tab-button {
            width: 100%;
            text-align: left;
            padding: 12px;
          }

          .customer-header,
          .user-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .customer-actions,
          .user-actions {
            width: 100%;
            justify-content: space-between;
          }

          .btn {
            flex: 1;
            justify-content: center;
          }

          .customer-list table,
          .user-list table {
            display: block;
            overflow-x: auto;
          }

          .customer-list th,
          .customer-list td,
          .user-list th,
          .user-list td {
            padding: 8px;
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .btn {
            padding: 6px 12px;
            font-size: 12px;
          }

          .customer-title,
          .user-title {
            font-size: 18px;
          }

          .status-badge {
            padding: 2px 6px;
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default Admin; 