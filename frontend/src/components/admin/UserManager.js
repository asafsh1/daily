import React, { useEffect, useState } from 'react';
import axios from '../../utils/axiosConfig';
import Spinner from '../layout/Spinner';

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user'
  });
  const { name, email, role } = formData;

  // Load users on component mount
  useEffect(() => {
    getUsers();
  }, []);

  // Fetch users from API
  const getUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/users');
      setUsers(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setLoading(false);
    }
  };

  // Delete user
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`/api/users/${id}`);
        setUsers(users.filter(user => user._id !== id));
      } catch (err) {
        console.error('Error deleting user:', err);
        alert(`Error: ${err.response?.data?.msg || 'Something went wrong'}`);
      }
    }
  };

  // Open form to edit user
  const handleEdit = (user) => {
    setEditUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'user'
    });
    setShowForm(true);
  };

  // Handle form change
  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission (add/edit)
  const onSubmit = async e => {
    e.preventDefault();
    
    try {
      if (editUser) {
        // Update existing user
        const res = await axios.put(`/api/users/${editUser._id}`, formData);
        setUsers(
          users.map(user => 
            user._id === editUser._id ? res.data : user
          )
        );
      } else {
        // Add new user - requires password for new users
        const newUserData = {
          ...formData,
          password: generatePassword()
        };
        
        const res = await axios.post('/api/users', newUserData);
        setUsers([...users, res.data]);
      }
      
      // Close form and reset
      setShowForm(false);
      setEditUser(null);
      setFormData({
        name: '',
        email: '',
        role: 'user'
      });
    } catch (err) {
      console.error('Error saving user:', err);
      alert(`Error: ${err.response?.data?.errors?.[0]?.msg || err.response?.data?.msg || 'Something went wrong'}`);
    }
  };

  // Generate a random password for new users
  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Handle form cancel
  const handleCancel = () => {
    setShowForm(false);
    setEditUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'user'
    });
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">User Management</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowForm(true)}
          disabled={showForm}
        >
          <i className="fas fa-plus"></i> Add User
        </button>
      </div>

      {showForm && (
        <div className="card my-3">
          <div className="card-header bg-light">
            <h3>{editUser ? 'Edit User' : 'Add New User'}</h3>
          </div>
          <div className="card-body">
            <form onSubmit={onSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  id="name" 
                  name="name" 
                  value={name} 
                  onChange={onChange} 
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input 
                  type="email" 
                  className="form-control" 
                  id="email" 
                  name="email" 
                  value={email} 
                  onChange={onChange} 
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role *</label>
                <select 
                  className="form-control" 
                  id="role" 
                  name="role" 
                  value={role} 
                  onChange={onChange} 
                  required 
                >
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {!editUser && (
                <div className="alert alert-info">
                  <i className="fas fa-info-circle"></i> A random password will be generated for new users.
                  They can reset it after their first login.
                </div>
              )}

              <div className="form-actions mt-4">
                <button type="submit" className="btn btn-primary">
                  {editUser ? 'Update User' : 'Add User'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary ml-2" 
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : users.length > 0 ? (
        <div className="users">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Date Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge badge-${
                      user.role === 'admin' ? 'danger' : 
                      user.role === 'manager' ? 'warning' : 'primary'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{new Date(user.date).toLocaleDateString()}</td>
                  <td>
                    <button 
                      onClick={() => handleEdit(user)} 
                      className="btn btn-sm btn-primary"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      onClick={() => handleDelete(user._id)} 
                      className="btn btn-sm btn-danger"
                      disabled={user.role === 'admin'}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No users found. Please add a user.</p>
      )}
    </div>
  );
};

export default UserManager; 