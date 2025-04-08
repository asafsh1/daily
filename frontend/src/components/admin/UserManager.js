import React, { useEffect, useState } from 'react';
import axios from '../../utils/axiosConfig';
import Spinner from '../layout/Spinner';
import { toast } from 'react-toastify';

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'team_member'
  });
  const [error, setError] = useState(null);

  // Fetch users on component mount
  useEffect(() => {
    getUsers();
  }, []);

  // Fetch users from API
  const getUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again later.');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Handle user deletion
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await axios.delete(`/api/users/${id}`);
      setUsers(users.filter(user => user._id !== id && user.id !== id));
      toast.success('User deleted successfully');
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error(err.response?.data?.msg || 'Failed to delete user');
    }
  };

  // Handle form input changes
  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const onSubmit = async e => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        // Update existing user
        const res = await axios.put(`/api/users/${editingUser._id || editingUser.id}`, formData);
        setUsers(users.map(user => 
          (user._id === editingUser._id || user.id === editingUser.id) ? res.data : user
        ));
        toast.success('User updated successfully');
      } else {
        // Create new user
        const res = await axios.post('/api/users', formData);
        setUsers([...users, res.data]);
        toast.success('User created successfully');
      }
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'team_member'
      });
      setShowForm(false);
      setEditingUser(null);
    } catch (err) {
      console.error('Error saving user:', err);
      const errorMsg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.msg || 'An error occurred';
      toast.error(errorMsg);
    }
  };

  // Generate a random password
  const generatePassword = () => {
    const length = 10;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    setFormData({ ...formData, password });
  };

  // Edit a user
  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Don't include the password
      role: user.role
    });
    setShowForm(true);
  };

  // Cancel form editing
  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'team_member'
    });
  };

  if (loading) return <Spinner />;

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

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
          </div>
          <div className="card-body">
            <form onSubmit={onSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-control"
                  value={formData.name}
                  onChange={onChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-control"
                  value={formData.email}
                  onChange={onChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">
                  Password
                  {editingUser && ' (Leave blank to keep unchanged)'}
                </label>
                <div className="input-group">
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="form-control"
                    value={formData.password}
                    onChange={onChange}
                    required={!editingUser}
                  />
                  <div className="input-group-append">
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary"
                      onClick={generatePassword}
                    >
                      Generate
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  name="role"
                  className="form-control"
                  value={formData.role}
                  onChange={onChange}
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="team_member">Team Member</option>
                </select>
              </div>
              
              <div className="form-group mt-4">
                <button type="submit" className="btn btn-primary mr-2">
                  {editingUser ? 'Update User' : 'Add User'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {users.length === 0 ? (
        <div className="alert alert-info">No users found</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id || user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${
                      user.role === 'admin' ? 'bg-danger' : 
                      user.role === 'manager' ? 'bg-warning' : 'bg-info'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : 
                       user.role === 'manager' ? 'Manager' : 'Team Member'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-sm btn-outline-primary mr-2" 
                      onClick={() => handleEdit(user)}
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(user._id || user.id)}
                      disabled={user.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1}
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
    </div>
  );
};

export default UserManager; 