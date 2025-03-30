import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const initialState = {
  code: '',
  name: '',
  trackingUrlTemplate: '',
  trackingInstructions: '',
  active: true
};

const AirlineForm = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(initialState);
  const { code, name, trackingUrlTemplate, trackingInstructions, active } = formData;

  // Set form data when initialData changes (editing mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || '',
        name: initialData.name || '',
        trackingUrlTemplate: initialData.trackingUrlTemplate || '',
        trackingInstructions: initialData.trackingInstructions || '',
        active: initialData.active !== undefined ? initialData.active : true
      });
    } else {
      setFormData(initialState);
    }
  }, [initialData]);

  const onChange = e => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const onFormSubmit = e => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="card my-3">
      <div className="card-header bg-light">
        <h3>{initialData ? 'Edit Airline' : 'Add New Airline'}</h3>
      </div>
      <div className="card-body">
        <form onSubmit={onFormSubmit}>
          <div className="form-group">
            <label htmlFor="code">Airline Code *</label>
            <input 
              type="text" 
              className="form-control" 
              id="code" 
              name="code" 
              value={code} 
              onChange={onChange} 
              required 
              placeholder="e.g., 114 (El Al)"
              disabled={initialData !== null} // Can't change code when editing
            />
            <small className="form-text text-muted">
              The 3-digit airline code used in AWB numbers
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="name">Airline Name *</label>
            <input 
              type="text" 
              className="form-control" 
              id="name" 
              name="name" 
              value={name} 
              onChange={onChange} 
              required 
              placeholder="e.g., El Al Airlines"
            />
          </div>

          <div className="form-group">
            <label htmlFor="trackingUrlTemplate">Tracking URL Template *</label>
            <input 
              type="text" 
              className="form-control" 
              id="trackingUrlTemplate" 
              name="trackingUrlTemplate" 
              value={trackingUrlTemplate} 
              onChange={onChange} 
              required 
              placeholder="e.g., https://example.com/track?awb={awbNumber}"
            />
            <small className="form-text text-muted">
              Use {'{awbNumber}'} as placeholder for the AWB number without prefix
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="trackingInstructions">Tracking Instructions</label>
            <textarea 
              className="form-control" 
              id="trackingInstructions" 
              name="trackingInstructions" 
              value={trackingInstructions} 
              onChange={onChange} 
              rows="3"
              placeholder="Optional instructions for using this airline's tracking"
            ></textarea>
          </div>

          <div className="form-check">
            <input 
              type="checkbox" 
              className="form-check-input" 
              id="active" 
              name="active" 
              checked={active} 
              onChange={onChange} 
            />
            <label className="form-check-label" htmlFor="active">Active</label>
            <small className="form-text text-muted d-block">
              Inactive airlines will not be used for tracking
            </small>
          </div>

          <div className="form-actions mt-4">
            <button type="submit" className="btn btn-primary">
              {initialData ? 'Update Airline' : 'Add Airline'}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary ml-2" 
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

AirlineForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default AirlineForm; 