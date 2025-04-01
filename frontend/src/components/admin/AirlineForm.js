import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const AirlineForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    trackingUrlTemplate: '',
    status: 'active'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        code: initialData.code || '',
        trackingUrlTemplate: initialData.trackingUrlTemplate || '',
        status: initialData.status || 'active'
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="airline-form">
      <style>
        {`
          .airline-form {
            background: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
          }
          .form-title {
            color: #2c3e50;
            font-size: 18px;
            margin-bottom: 20px;
          }
          .form-group {
            margin-bottom: 20px;
          }
          .form-label {
            display: block;
            margin-bottom: 8px;
            color: #495057;
            font-weight: 500;
          }
          .form-control {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 14px;
            transition: border-color 0.2s;
          }
          .form-control:focus {
            border-color: #80bdff;
            outline: none;
            box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25);
          }
          .form-text {
            font-size: 12px;
            color: #6c757d;
            margin-top: 4px;
          }
          .form-buttons {
            display: flex;
            gap: 10px;
            margin-top: 24px;
          }
          .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
          }
          .btn-primary {
            background: #0d6efd;
            color: white;
          }
          .btn-secondary {
            background: #6c757d;
            color: white;
          }
          .btn:hover {
            opacity: 0.9;
          }
        `}
      </style>

      <h3 className="form-title">
        {initialData ? 'Edit Airline' : 'Add New Airline'}
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">
            Airline Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            className="form-control"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="code">
            Airline Code
          </label>
          <input
            type="text"
            id="code"
            name="code"
            className="form-control"
            value={formData.code}
            onChange={handleChange}
            required
          />
          <div className="form-text">
            Enter the IATA or ICAO code for the airline
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="trackingUrlTemplate">
            Tracking URL Template
          </label>
          <input
            type="text"
            id="trackingUrlTemplate"
            name="trackingUrlTemplate"
            className="form-control"
            value={formData.trackingUrlTemplate}
            onChange={handleChange}
            required
          />
          <div className="form-text">
            Use {`{awb}`} as placeholder for the AWB number
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            className="form-control"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="form-buttons">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {initialData ? 'Update Airline' : 'Add Airline'}
          </button>
        </div>
      </form>
    </div>
  );
};

AirlineForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  initialData: PropTypes.shape({
    name: PropTypes.string,
    code: PropTypes.string,
    trackingUrlTemplate: PropTypes.string,
    status: PropTypes.string
  })
};

export default AirlineForm; 