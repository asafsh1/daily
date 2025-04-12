import React, { useState, useEffect } from 'react';

const CustomerForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    awbInstructions: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        companyName: initialData.companyName || '',
        contactName: initialData.contactName || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        awbInstructions: initialData.awbInstructions || ''
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
      <div className="customer-form modal-content">
        <div className="modal-header">
          <h3>{initialData ? 'Edit Customer' : 'Add New Customer'}</h3>
          <button type="button" className="close-button" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="companyName">Company Name *</label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="contactName">Contact Name</label>
            <input
              type="text"
              id="contactName"
              name="contactName"
              value={formData.contactName}
              onChange={handleChange}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="awbInstructions">AWB Instructions</label>
            <textarea
              id="awbInstructions"
              name="awbInstructions"
              value={formData.awbInstructions}
              onChange={handleChange}
              className="form-control"
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {initialData ? 'Update' : 'Add'} Customer
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

          .customer-form form {
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
          .form-group textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 14px;
          }

          .form-group textarea {
            resize: vertical;
            min-height: 80px;
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

export default CustomerForm; 