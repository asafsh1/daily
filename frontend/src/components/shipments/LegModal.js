import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from '../../utils/axiosConfig';
import { toast } from 'react-toastify';
import moment from 'moment';

// Initial form state for add/edit
const initialState = {
  from: '',
  to: '',
  carrier: '',
  legOrder: 0,
  departureDate: '',
  departureTime: '',
  arrivalDate: '',
  arrivalTime: '',
  trackingNumber: '',
  status: 'Pending',
  notes: '',
  legId: '',
  flightNumber: ''
};

const LegModal = ({ 
  isOpen, 
  onClose, 
  shipmentId, 
  editingLeg = null, 
  onSave, 
  airlines = [] 
}) => {
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [changeLog, setChangeLog] = useState([]);

  // When editing leg changes, update the form
  useEffect(() => {
    if (editingLeg) {
      // Convert dates to local format for the form
      const departureDate = editingLeg.departureDate 
        ? moment(editingLeg.departureDate).format('YYYY-MM-DD') 
        : '';
      
      const arrivalDate = editingLeg.arrivalDate 
        ? moment(editingLeg.arrivalDate).format('YYYY-MM-DD') 
        : '';
      
      const departureTime = editingLeg.departureTime || '';
      const arrivalTime = editingLeg.arrivalTime || '';

      setFormData({
        from: editingLeg.from || editingLeg.origin || '',
        to: editingLeg.to || editingLeg.destination || '',
        carrier: editingLeg.carrier || '',
        legOrder: editingLeg.legOrder || 0,
        departureDate,
        departureTime,
        arrivalDate,
        arrivalTime,
        trackingNumber: editingLeg.trackingNumber || editingLeg.mawbNumber || '',
        status: editingLeg.status || 'Pending',
        notes: editingLeg.notes || '',
        legId: editingLeg.legId || '',
        flightNumber: editingLeg.flightNumber || editingLeg.flight || ''
      });

      // Load change log if available
      if (editingLeg.statusHistory && Array.isArray(editingLeg.statusHistory)) {
        setChangeLog(editingLeg.statusHistory);
      } else if (editingLeg._id) {
        fetchLegHistory(editingLeg._id);
      }
    } else {
      // For a new leg, reset the form but increment the leg order
      setFormData({
        ...initialState,
        legOrder: findNextLegOrder()
      });
      setChangeLog([]);
    }
  }, [editingLeg]);

  // Find the next available leg order
  const findNextLegOrder = () => {
    if (!editingLeg) return 1;
    return editingLeg.legOrder || 1;
  };

  // Fetch leg history from API if available
  const fetchLegHistory = async (legId) => {
    try {
      const response = await axios.get(`/api/shipment-legs/${legId}/history`);
      if (response.data && Array.isArray(response.data)) {
        setChangeLog(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch leg history:', err);
    }
  };

  // Form change handler
  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear any validation error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.from.trim()) newErrors.from = 'Origin is required';
    if (!formData.to.trim()) newErrors.to = 'Destination is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }
    
    setLoading(true);
    
    try {
      // Combine date and time fields
      const combinedData = {
        ...formData,
        shipment: shipmentId,
        departureDate: formData.departureDate ? 
          `${formData.departureDate}T${formData.departureTime || '00:00'}:00.000Z` : 
          null,
        arrivalDate: formData.arrivalDate ? 
          `${formData.arrivalDate}T${formData.arrivalTime || '00:00'}:00.000Z` : 
          null
      };
      
      // Add or update the leg
      let result;
      
      if (editingLeg && editingLeg._id) {
        // Update existing leg
        result = await axios.put(`/api/shipment-legs/${editingLeg._id}`, combinedData);
        toast.success('Leg updated successfully');
      } else {
        // Create new leg
        result = await axios.post('/api/shipment-legs', combinedData);
        toast.success('Leg added successfully');
      }
      
      // Call the onSave callback with the result
      if (onSave && typeof onSave === 'function') {
        onSave(result.data);
      }
      
      // Close the modal
      onClose();
      
    } catch (err) {
      console.error('Error saving leg:', err);
      toast.error(`Failed to save leg: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // If the modal is not open, don't render anything
  if (!isOpen) return null;

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    return timestamp ? moment(timestamp).format('DD/MM/YYYY HH:mm') : 'N/A';
  };

  return (
    <div className="leg-modal-backdrop" onClick={onClose}>
      <div className="leg-modal" onClick={e => e.stopPropagation()}>
        <div className="leg-modal-header">
          <h4>{editingLeg ? 'Edit Leg' : 'Add New Leg'}</h4>
          <button className="leg-modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Leg ID field (read-only if editing) */}
          {editingLeg && (
            <div className="form-group">
              <label>Leg ID</label>
              <input
                type="text"
                className="form-control"
                name="legId"
                value={formData.legId}
                disabled
                readOnly
              />
            </div>
          )}
          
          <div className="row">
            <div className="col-md-2">
              <div className="form-group">
                <label>Leg Order</label>
                <input
                  type="number"
                  className="form-control"
                  name="legOrder"
                  value={formData.legOrder}
                  onChange={onChange}
                  min="1"
                />
              </div>
            </div>
            
            <div className="col-md-5">
              <div className="form-group">
                <label>Origin</label>
                <input
                  type="text"
                  className={`form-control ${errors.from ? 'is-invalid' : ''}`}
                  name="from"
                  value={formData.from}
                  onChange={onChange}
                  placeholder="From location"
                  required
                />
                {errors.from && <div className="invalid-feedback">{errors.from}</div>}
              </div>
            </div>
            
            <div className="col-md-5">
              <div className="form-group">
                <label>Destination</label>
                <input
                  type="text"
                  className={`form-control ${errors.to ? 'is-invalid' : ''}`}
                  name="to"
                  value={formData.to}
                  onChange={onChange}
                  placeholder="To location"
                  required
                />
                {errors.to && <div className="invalid-feedback">{errors.to}</div>}
              </div>
            </div>
          </div>
          
          <div className="row">
            <div className="col-md-6">
              <div className="form-group">
                <label>Airline</label>
                <select
                  className="form-control"
                  name="carrier"
                  value={formData.carrier}
                  onChange={onChange}
                >
                  <option value="">-- Select Airline --</option>
                  {airlines.map(airline => (
                    <option key={airline._id} value={airline.name}>
                      {airline.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="form-group">
                <label>Flight Number</label>
                <input
                  type="text"
                  className="form-control"
                  name="flightNumber"
                  value={formData.flightNumber}
                  onChange={onChange}
                  placeholder="Flight number"
                />
              </div>
            </div>
          </div>
          
          <div className="row">
            <div className="col-md-6">
              <div className="form-group">
                <label>AWB/Tracking Number</label>
                <input
                  type="text"
                  className="form-control"
                  name="trackingNumber"
                  value={formData.trackingNumber}
                  onChange={onChange}
                  placeholder="AWB or tracking number"
                />
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="form-group">
                <label>Status</label>
                <select
                  className="form-control"
                  name="status"
                  value={formData.status}
                  onChange={onChange}
                >
                  <option value="Pending">Pending</option>
                  <option value="Planned">Planned</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Departed">Departed</option>
                  <option value="Arrived">Arrived</option>
                  <option value="Completed">Completed</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="row">
            <div className="col-md-3">
              <div className="form-group">
                <label>Departure Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="departureDate"
                  value={formData.departureDate}
                  onChange={onChange}
                />
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="form-group">
                <label>Departure Time</label>
                <input
                  type="time"
                  className="form-control"
                  name="departureTime"
                  value={formData.departureTime}
                  onChange={onChange}
                />
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="form-group">
                <label>Arrival Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="arrivalDate"
                  value={formData.arrivalDate}
                  onChange={onChange}
                />
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="form-group">
                <label>Arrival Time</label>
                <input
                  type="time"
                  className="form-control"
                  name="arrivalTime"
                  value={formData.arrivalTime}
                  onChange={onChange}
                />
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label>Notes</label>
            <textarea
              className="form-control"
              name="notes"
              value={formData.notes}
              onChange={onChange}
              placeholder="Additional notes"
              rows="3"
            ></textarea>
          </div>
          
          {/* Display changelog if editing */}
          {editingLeg && changeLog.length > 0 && (
            <div className="changelog-section">
              <h5>Change History</h5>
              <div className="changelog-entries">
                {changeLog.map((entry, index) => (
                  <div key={index} className="changelog-entry">
                    <span>Status: <strong>{entry.status}</strong></span>
                    <div className="changelog-timestamp">
                      {formatTimestamp(entry.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="leg-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (editingLeg ? 'Update Leg' : 'Add Leg')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

LegModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  shipmentId: PropTypes.string.isRequired,
  editingLeg: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  airlines: PropTypes.array
};

export default LegModal; 