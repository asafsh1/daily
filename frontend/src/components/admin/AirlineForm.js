import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const AirlineForm = ({ onSubmit, onCancel, airline }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    trackingUrlTemplate: '',
    status: 'active'
  });

  useEffect(() => {
    if (airline) {
      setFormData({
        name: airline.name || '',
        code: airline.code || '',
        trackingUrlTemplate: airline.trackingUrlTemplate || '',
        status: airline.status || 'active'
      });
    }
  }, [airline]);

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
    <div className="modal-overlay">
      <div className="airline-form modal-content">
        <div className="modal-header">
          <h3>{airline ? 'Edit Airline' : 'Add New Airline'}</h3>
          <button type="button" className="close-button" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
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
            <label htmlFor="code">Code</label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              placeholder="Airline Code (e.g., 114, 176)"
            />
            <small className="form-text text-muted">
              Standard 3-digit IATA airline code
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="trackingUrlTemplate">Tracking URL Template</label>
            <input
              type="text"
              id="trackingUrlTemplate"
              name="trackingUrlTemplate"
              value={formData.trackingUrlTemplate}
              onChange={handleChange}
              required
              placeholder={"https://example.com/track/{awb}"}
            />
            <small className="form-text text-muted">
              Use {'{'}'awb'{'}'} as a placeholder for the AWB number
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {airline ? 'Update' : 'Add'} Airline
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

          .airline-form form {
            padding: 20px;
          }
          
          .form-group {
            margin-bottom: 15px;
          }

          .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          }

          .form-group input,
          .form-group select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
          }
          
          .form-text {
            display: block;
            margin-top: 5px;
            font-size: 12px;
            color: #6c757d;
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
            background-color: #007bff;
            color: white;
          }

          .btn-secondary {
            background-color: #6c757d;
            color: white;
          }
        `}</style>
      </div>
    </div>
  );
};

AirlineForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  airline: PropTypes.shape({
    name: PropTypes.string,
    code: PropTypes.string,
    trackingUrlTemplate: PropTypes.string,
    status: PropTypes.string
  })
};

export default AirlineForm; 