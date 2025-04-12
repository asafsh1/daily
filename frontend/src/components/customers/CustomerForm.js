import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const CustomerForm = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    awbInstructions: ''
  });

  const [errors, setErrors] = useState({});

  // Load initial data if editing
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

  const { companyName, contactName, email, phone, awbInstructions } = formData;

  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    // Clear error for this field when user types
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmitForm = e => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="customer-form-container">
      <h2>{initialData ? 'Edit Customer' : 'Add New Customer'}</h2>
      <form className="form customer-form" onSubmit={onSubmitForm}>
        <div className="form-group">
          <label htmlFor="companyName">Company Name *</label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={companyName}
            onChange={onChange}
            className={errors.companyName ? 'form-control is-invalid' : 'form-control'}
            placeholder="Company name"
            required
          />
          {errors.companyName && <div className="invalid-feedback">{errors.companyName}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="contactName">Contact Name</label>
          <input
            type="text"
            id="contactName"
            name="contactName"
            value={contactName}
            onChange={onChange}
            className="form-control"
            placeholder="Primary contact name"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={onChange}
            className={errors.email ? 'form-control is-invalid' : 'form-control'}
            placeholder="Email address"
          />
          {errors.email && <div className="invalid-feedback">{errors.email}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input
            type="text"
            id="phone"
            name="phone"
            value={phone}
            onChange={onChange}
            className="form-control"
            placeholder="Phone number"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="awbInstructions">AWB Instructions</label>
          <textarea
            id="awbInstructions"
            name="awbInstructions"
            value={awbInstructions}
            onChange={onChange}
            className="form-control"
            placeholder="AWB instructions"
            rows="3"
          />
        </div>
        
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {initialData ? 'Update Customer' : 'Add Customer'}
          </button>
          <button 
            type="button" 
            className="btn btn-light" 
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

CustomerForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default CustomerForm; 