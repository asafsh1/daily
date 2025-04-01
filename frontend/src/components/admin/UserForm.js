import React, { useState, useEffect } from 'react';

const UserForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        role: initialData.role || 'user'
      });
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="user-form modal-content">
        <div className="modal-header">
          <h3>{initialData ? 'Edit User' : 'Add New User'}</h3>
          <button type="button" className="close-button" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="operations">Operations team</option>
              <option value="finance">Finance team</option>
              <option value="agent">Agent</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          {!initialData && (
            <div className="alert">
              <i className="fas fa-info-circle"></i> A random password will be generated for new users.
              They can reset it after their first login.
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {initialData ? 'Update User' : 'Add User'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
          }
          
          .modal-content {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            padding: 0;
          }
          
          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
          }
          
          .modal-header h3 {
            margin: 0;
            color: #2c3e50;
          }
          
          .close-button {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #777;
          }
          
          .close-button:hover {
            color: #333;
          }

          .user-form form {
            padding: 20px;
          }

          .form-group {
            margin-bottom: 15px;
          }

          .form-group label {
            display: block;
            margin-bottom: 5px;
            color: #495057;
            font-weight: 500;
          }

          .form-group input,
          .form-group select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 14px;
          }

          .alert {
            padding: 12px;
            background-color: #e3f2fd;
            color: #0d47a1;
            border-radius: 4px;
            margin-bottom: 15px;
          }

          .form-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            justify-content: flex-end;
          }

          .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }

          .btn-primary {
            background: #0d6efd;
            color: white;
          }

          .btn-secondary {
            background: #6c757d;
            color: white;
          }
        `}</style>
      </div>
    </div>
  );
};

export default UserForm; 