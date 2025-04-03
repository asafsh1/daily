import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AirlineManager from './AirlineManager';
import CustomerForm from './CustomerForm';
import UserForm from './UserForm';
import ShipperForm from './ShipperForm';
import ConsigneeForm from './ConsigneeForm';
import NotifyPartyForm from './NotifyPartyForm';
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
  const [shippers, setShippers] = useState([]);
  const [consignees, setConsignees] = useState([]);
  const [notifyParties, setNotifyParties] = useState([]);
  const [showShipperForm, setShowShipperForm] = useState(false);
  const [editShipper, setEditShipper] = useState(null);
  const [showConsigneeForm, setShowConsigneeForm] = useState(false);
  const [editConsignee, setEditConsignee] = useState(null);
  const [showNotifyPartyForm, setShowNotifyPartyForm] = useState(false);
  const [editNotifyParty, setEditNotifyParty] = useState(null);

  // Define all tabs
  const tabs = [
    { id: 'airlines', label: 'Airlines' },
    { id: 'customers', label: 'Customers' },
    { id: 'users', label: 'Users' },
    { id: 'shippers', label: 'Shippers' },
    { id: 'consignees', label: 'Consignees' },
    { id: 'notifyParties', label: 'Notify Parties' }
  ];

  useEffect(() => {
    if (activeTab === 'customers') {
      fetchCustomers();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'shippers') {
      fetchShippers();
    } else if (activeTab === 'consignees') {
      fetchConsignees();
    } else if (activeTab === 'notifyParties') {
      fetchNotifyParties();
    }
  }, [activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Reset form states when changing tabs
    setShowCustomerForm(false);
    setEditingCustomer(null);
    setShowUserForm(false);
    setEditingUser(null);
    setShowShipperForm(false);
    setEditShipper(null);
    setShowConsigneeForm(false);
    setEditConsignee(null);
    setShowNotifyPartyForm(false);
    setEditNotifyParty(null);
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

  // Fetch shippers
  const fetchShippers = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/shippers`, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Direct API test results for shippers:', data);
      setShippers(data);
    } catch (error) {
      console.error('Error fetching shippers:', error);
      toast.error('Failed to load shippers data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch consignees
  const fetchConsignees = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/consignees`, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Direct API test results for consignees:', data);
      setConsignees(data);
    } catch (error) {
      console.error('Error fetching consignees:', error);
      toast.error('Failed to load consignees data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch notify parties
  const fetchNotifyParties = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/notify-parties`, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Direct API test results for notify parties:', data);
      setNotifyParties(data);
    } catch (error) {
      console.error('Error fetching notify parties:', error);
      toast.error('Failed to load notify parties data');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'airlines':
        return <AirlineManager />;
      case 'customers':
        return (
          <div className="admin-section">
            <div className="section-header">
              <h2>Customer Management</h2>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingCustomer(null);
                  setShowCustomerForm(true);
                }}
              >
                <i className="fas fa-plus"></i> Add Customer
              </button>
            </div>

            {loading ? (
              <div>Loading customers...</div>
            ) : (
              <>
                {customers.length === 0 ? (
                  <p>No customers found.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Address</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map(customer => (
                          <tr key={customer._id}>
                            <td>{customer.customerId || `CUST-${customer._id?.substring(0, 8) || 'N/A'}`}</td>
                            <td>{customer.name}</td>
                            <td>{customer.email}</td>
                            <td>{customer.phone}</td>
                            <td>{customer.address}</td>
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {showCustomerForm && (
                  <CustomerForm
                    customer={editingCustomer}
                    onSave={editingCustomer ? handleUpdateCustomer : handleAddCustomer}
                    onCancel={() => {
                      setShowCustomerForm(false);
                      setEditingCustomer(null);
                    }}
                  />
                )}
              </>
            )}
          </div>
        );
      case 'users':
        return (
          <div className="admin-section">
            <div className="section-header">
              <h2>User Management</h2>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingUser(null);
                  setShowUserForm(true);
                }}
              >
                <i className="fas fa-plus"></i> Add User
              </button>
            </div>

            {loading ? (
              <div>Loading users...</div>
            ) : (
              <>
                {users.length === 0 ? (
                  <p>No users found.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table">
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
                        {users.map(user => (
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {showUserForm && (
                  <UserForm
                    user={editingUser}
                    onSave={handleUpdateUser}
                    onCancel={() => {
                      setShowUserForm(false);
                      setEditingUser(null);
                    }}
                  />
                )}
              </>
            )}
          </div>
        );
      case 'shippers':
        return (
          <div className="admin-section">
            <div className="section-header">
              <h2>Shipper Management</h2>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditShipper(null);
                  setShowShipperForm(true);
                }}
              >
                <i className="fas fa-plus"></i> Add Shipper
              </button>
            </div>

            {loading ? (
              <div>Loading shippers...</div>
            ) : (
              <>
                {shippers.length === 0 ? (
                  <p>No shippers found.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Address</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shippers.map(shipper => (
                          <tr key={shipper._id}>
                            <td>{shipper.shipperId || `SHP-${shipper._id?.substring(0, 8) || 'N/A'}`}</td>
                            <td>{shipper.name}</td>
                            <td>{shipper.email}</td>
                            <td>{shipper.phone}</td>
                            <td>{shipper.address}</td>
                            <td>
                              <button
                                className="btn-icon btn-edit"
                                onClick={() => handleEditShipper(shipper)}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteShipper(shipper._id)}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {showShipperForm && (
                  <div className="form-modal">
                    <h3>{editShipper ? 'Edit Shipper' : 'Add Shipper'}</h3>
                    <ShipperForm
                      shipper={editShipper}
                      onSave={handleSaveShipper}
                      onCancel={() => {
                        setShowShipperForm(false);
                        setEditShipper(null);
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        );
      case 'consignees':
        return (
          <div className="admin-section">
            <div className="section-header">
              <h2>Consignee Management</h2>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditConsignee(null);
                  setShowConsigneeForm(true);
                }}
              >
                <i className="fas fa-plus"></i> Add Consignee
              </button>
            </div>

            {loading ? (
              <div>Loading consignees...</div>
            ) : (
              <>
                {consignees.length === 0 ? (
                  <p>No consignees found.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Address</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consignees.map(consignee => (
                          <tr key={consignee._id}>
                            <td>{consignee.consigneeId || `CNS-${consignee._id?.substring(0, 8) || 'N/A'}`}</td>
                            <td>{consignee.name}</td>
                            <td>{consignee.email}</td>
                            <td>{consignee.phone}</td>
                            <td>{consignee.address}</td>
                            <td>
                              <button
                                className="btn-icon btn-edit"
                                onClick={() => handleEditConsignee(consignee)}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteConsignee(consignee._id)}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {showConsigneeForm && (
                  <div className="form-modal">
                    <h3>{editConsignee ? 'Edit Consignee' : 'Add Consignee'}</h3>
                    <ConsigneeForm
                      consignee={editConsignee}
                      onSave={handleSaveConsignee}
                      onCancel={() => {
                        setShowConsigneeForm(false);
                        setEditConsignee(null);
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        );
      case 'notifyParties':
        return (
          <div className="admin-section">
            <div className="section-header">
              <h2>Notify Party Management</h2>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditNotifyParty(null);
                  setShowNotifyPartyForm(true);
                }}
              >
                <i className="fas fa-plus"></i> Add Notify Party
              </button>
            </div>

            {loading ? (
              <div>Loading notify parties...</div>
            ) : (
              <>
                {notifyParties.length === 0 ? (
                  <p>No notify parties found.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Address</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notifyParties.map(notifyParty => (
                          <tr key={notifyParty._id}>
                            <td>{notifyParty.notifyPartyId || `NP-${notifyParty._id?.substring(0, 8) || 'N/A'}`}</td>
                            <td>{notifyParty.name}</td>
                            <td>{notifyParty.email}</td>
                            <td>{notifyParty.phone}</td>
                            <td>{notifyParty.address}</td>
                            <td>
                              <button
                                className="btn-icon btn-edit"
                                onClick={() => handleEditNotifyParty(notifyParty)}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteNotifyParty(notifyParty._id)}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {showNotifyPartyForm && (
                  <div className="form-modal">
                    <h3>{editNotifyParty ? 'Edit Notify Party' : 'Add Notify Party'}</h3>
                    <NotifyPartyForm
                      notifyParty={editNotifyParty}
                      onSave={handleSaveNotifyParty}
                      onCancel={() => {
                        setShowNotifyPartyForm(false);
                        setEditNotifyParty(null);
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        );
      default:
        return <div>Select a tab</div>;
    }
  };

  // Add handler functions for Shippers
  const handleEditShipper = (shipper) => {
    setEditShipper(shipper);
    setShowShipperForm(true);
  };

  const handleDeleteShipper = async (shipperId) => {
    if (window.confirm('Are you sure you want to delete this shipper?')) {
      try {
        setLoading(true);
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
        const response = await fetch(`${apiUrl}/api/shippers/${shipperId}`, {
          method: 'DELETE',
          headers: {
            'x-auth-token': localStorage.getItem('token')
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        setShippers(shippers.filter(shipper => shipper._id !== shipperId));
        toast.success('Shipper deleted successfully');
      } catch (error) {
        console.error('Error deleting shipper:', error);
        toast.error('Failed to delete shipper');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveShipper = async (shipperData) => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      
      // Generate unique ID if it's a new shipper
      if (!shipperData._id) {
        shipperData.shipperId = generateUniqueId(ID_PREFIXES.SHIPPER);
      }
      
      const method = shipperData._id ? 'PUT' : 'POST';
      const url = shipperData._id 
        ? `${apiUrl}/api/shippers/${shipperData._id}` 
        : `${apiUrl}/api/shippers`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify(shipperData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const savedShipper = await response.json();
      
      if (shipperData._id) {
        setShippers(shippers.map(shipper => 
          shipper._id === shipperData._id ? savedShipper : shipper
        ));
        toast.success('Shipper updated successfully');
      } else {
        setShippers([...shippers, savedShipper]);
        toast.success('Shipper added successfully');
      }
      
      setShowShipperForm(false);
      setEditShipper(null);
    } catch (error) {
      console.error('Error saving shipper:', error);
      toast.error('Failed to save shipper');
    } finally {
      setLoading(false);
    }
  };

  // Add handler functions for Consignees
  const handleEditConsignee = (consignee) => {
    setEditConsignee(consignee);
    setShowConsigneeForm(true);
  };

  const handleDeleteConsignee = async (consigneeId) => {
    if (window.confirm('Are you sure you want to delete this consignee?')) {
      try {
        setLoading(true);
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
        const response = await fetch(`${apiUrl}/api/consignees/${consigneeId}`, {
          method: 'DELETE',
          headers: {
            'x-auth-token': localStorage.getItem('token')
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        setConsignees(consignees.filter(consignee => consignee._id !== consigneeId));
        toast.success('Consignee deleted successfully');
      } catch (error) {
        console.error('Error deleting consignee:', error);
        toast.error('Failed to delete consignee');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveConsignee = async (consigneeData) => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      
      // Generate unique ID if it's a new consignee
      if (!consigneeData._id) {
        consigneeData.consigneeId = generateUniqueId(ID_PREFIXES.CONSIGNEE);
      }
      
      const method = consigneeData._id ? 'PUT' : 'POST';
      const url = consigneeData._id 
        ? `${apiUrl}/api/consignees/${consigneeData._id}` 
        : `${apiUrl}/api/consignees`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify(consigneeData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const savedConsignee = await response.json();
      
      if (consigneeData._id) {
        setConsignees(consignees.map(consignee => 
          consignee._id === consigneeData._id ? savedConsignee : consignee
        ));
        toast.success('Consignee updated successfully');
      } else {
        setConsignees([...consignees, savedConsignee]);
        toast.success('Consignee added successfully');
      }
      
      setShowConsigneeForm(false);
      setEditConsignee(null);
    } catch (error) {
      console.error('Error saving consignee:', error);
      toast.error('Failed to save consignee');
    } finally {
      setLoading(false);
    }
  };

  // Add handler functions for Notify Parties
  const handleEditNotifyParty = (notifyParty) => {
    setEditNotifyParty(notifyParty);
    setShowNotifyPartyForm(true);
  };

  const handleDeleteNotifyParty = async (notifyPartyId) => {
    if (window.confirm('Are you sure you want to delete this notify party?')) {
      try {
        setLoading(true);
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
        const response = await fetch(`${apiUrl}/api/notify-parties/${notifyPartyId}`, {
          method: 'DELETE',
          headers: {
            'x-auth-token': localStorage.getItem('token')
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        setNotifyParties(notifyParties.filter(notifyParty => notifyParty._id !== notifyPartyId));
        toast.success('Notify party deleted successfully');
      } catch (error) {
        console.error('Error deleting notify party:', error);
        toast.error('Failed to delete notify party');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveNotifyParty = async (notifyPartyData) => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      
      // Generate unique ID if it's a new notify party
      if (!notifyPartyData._id) {
        notifyPartyData.notifyPartyId = generateUniqueId(ID_PREFIXES.NOTIFY_PARTY);
      }
      
      const method = notifyPartyData._id ? 'PUT' : 'POST';
      const url = notifyPartyData._id 
        ? `${apiUrl}/api/notify-parties/${notifyPartyData._id}` 
        : `${apiUrl}/api/notify-parties`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify(notifyPartyData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const savedNotifyParty = await response.json();
      
      if (notifyPartyData._id) {
        setNotifyParties(notifyParties.map(notifyParty => 
          notifyParty._id === notifyPartyData._id ? savedNotifyParty : notifyParty
        ));
        toast.success('Notify party updated successfully');
      } else {
        setNotifyParties([...notifyParties, savedNotifyParty]);
        toast.success('Notify party added successfully');
      }
      
      setShowNotifyPartyForm(false);
      setEditNotifyParty(null);
    } catch (error) {
      console.error('Error saving notify party:', error);
      toast.error('Failed to save notify party');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">Admin Panel</h1>
      
      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="tab-content">
        {renderContent()}
      </div>

      <style jsx>{`
        .admin-container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .admin-title {
          color: #2c3e50;
          font-size: 24px;
          margin-bottom: 30px;
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

        .tab-content {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow-x: auto;
        }

        .admin-section {
          padding: 20px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .section-header h2 {
          color: #2c3e50;
          font-size: 20px;
          margin: 0;
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

        .btn-primary {
          background: #0d6efd;
          color: white;
        }

        .btn-primary:hover {
          background: #0b5ed7;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px;
        }

        .table th,
        .table td {
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
          .admin-container {
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

          .section-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .btn {
            flex: 1;
            justify-content: center;
          }

          .table {
            display: block;
            overflow-x: auto;
          }

          .table th,
          .table td {
            padding: 8px;
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .btn {
            padding: 6px 12px;
            font-size: 12px;
          }

          .section-header h2 {
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