import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const NotifyPartyForm = ({ notifyParty, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  // Load notifyParty data if editing
  useEffect(() => {
    if (notifyParty) {
      setFormData({
        name: notifyParty.name || '',
        contactPerson: notifyParty.contactPerson || '',
        email: notifyParty.email || '',
        phone: notifyParty.phone || '',
        address: notifyParty.address || '',
        notes: notifyParty.notes || ''
      });
    }
  }, [notifyParty]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      _id: notifyParty?._id
    });
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
          {notifyParty ? 'Update Notify Party' : 'Add Notify Party'}
        </button>
      </div>
    </form>
  );
};

NotifyPartyForm.propTypes = {
  notifyParty: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default NotifyPartyForm; 