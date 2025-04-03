import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { generateUniqueId, ID_PREFIXES } from '../../utils/idGenerator';

const ShipperForm = ({ shipper, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    contactPerson: '',
    notes: ''
  });

  useEffect(() => {
    // If shipper data is provided, populate the form
    if (shipper) {
      setFormData({
        name: shipper.name || '',
        email: shipper.email || '',
        phone: shipper.phone || '',
        address: shipper.address || '',
        contactPerson: shipper.contactPerson || '',
        notes: shipper.notes || ''
      });
    } else {
      // Reset form when no shipper is provided
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        contactPerson: '',
        notes: ''
      });
    }
  }, [shipper]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create the shipper object
    const shipperData = {
      ...formData,
      ...(shipper && { _id: shipper._id }),
      shipperId: shipper?.shipperId || generateUniqueId(ID_PREFIXES.SHIPPER)
    };
    
    onSave(shipperData);
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label htmlFor="name">Name*</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="form-control"
        />
      </div>
      
      <div className="form-row">
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
            type="text"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="form-control"
          />
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="address">Address</label>
        <textarea
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          className="form-control"
          rows="3"
        ></textarea>
      </div>
      
      <div className="form-group">
        <label htmlFor="contactPerson">Contact Person</label>
        <input
          type="text"
          id="contactPerson"
          name="contactPerson"
          value={formData.contactPerson}
          onChange={handleChange}
          className="form-control"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="form-control"
          rows="3"
        ></textarea>
      </div>
      
      <div className="form-buttons">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
        >
          {shipper ? 'Update Shipper' : 'Add Shipper'}
        </button>
      </div>

      <style jsx>{`
        .form {
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
        
        .form-row {
          display: flex;
          gap: 20px;
        }
        
        .form-group {
          margin-bottom: 15px;
          width: 100%;
        }
        
        .form-control {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        
        textarea.form-control {
          resize: vertical;
        }
        
        .form-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }
        
        .btn {
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.3s ease;
        }
        
        .btn-primary {
          background-color: #0d6efd;
          color: white;
        }
        
        .btn-primary:hover {
          background-color: #0b5ed7;
        }
        
        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }
        
        .btn-secondary:hover {
          background-color: #5c636a;
        }
        
        @media (max-width: 768px) {
          .form-row {
            flex-direction: column;
            gap: 0;
          }
        }
      `}</style>
    </form>
  );
};

ShipperForm.propTypes = {
  shipper: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default ShipperForm; 