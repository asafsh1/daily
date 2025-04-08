import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from '../../utils/axiosConfig';
import { toast } from 'react-toastify';
import moment from 'moment';
import './Modal.css'; // New shared modal styles

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
  flightNumber: '',
  vessel: '' // Add vessel field
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
  const [activeTab, setActiveTab] = useState('details'); // For tab navigation

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
        flightNumber: editingLeg.flightNumber || editingLeg.flight || '',
        vessel: editingLeg.vessel || ''
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editingLeg ? 'Edit Shipment Leg' : 'Add New Shipment Leg'}</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-tabs">
          <button 
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Leg Details
          </button>
          {editingLeg && changeLog.length > 0 && (
            <button 
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              Status History
            </button>
          )}
        </div>

        <div className="modal-content">
          {activeTab === 'details' ? (
            <form onSubmit={handleSubmit} className="leg-form">
              <div className="form-grid">
                <div className="form-section">
                  <h4>Routing Information</h4>
                  
                  <div className="form-group order-field">
                    <label htmlFor="legOrder">Leg #</label>
                    <input
                      id="legOrder"
                      type="number"
                      className="form-control"
                      name="legOrder"
                      value={formData.legOrder}
                      onChange={onChange}
                      min="1"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="from">Origin</label>
                    <input
                      id="from"
                      type="text"
                      className={`form-control ${errors.from ? 'is-invalid' : ''}`}
                      name="from"
                      value={formData.from}
                      onChange={onChange}
                      placeholder="From location"
                      required
                    />
                    {errors.from && <div className="error-message">{errors.from}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="to">Destination</label>
                    <input
                      id="to"
                      type="text"
                      className={`form-control ${errors.to ? 'is-invalid' : ''}`}
                      name="to"
                      value={formData.to}
                      onChange={onChange}
                      placeholder="To location"
                      required
                    />
                    {errors.to && <div className="error-message">{errors.to}</div>}
                  </div>
                </div>
                
                <div className="form-section">
                  <h4>Carrier Details</h4>
                  
                  <div className="form-group">
                    <label htmlFor="carrier">Airline/Carrier</label>
                    <select
                      id="carrier"
                      className="form-control"
                      name="carrier"
                      value={formData.carrier}
                      onChange={onChange}
                    >
                      <option value="">-- Select Carrier --</option>
                      {airlines && airlines.length > 0 ? (
                        airlines.map(airline => (
                          <option key={airline._id} value={airline.name}>
                            {airline.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>Loading carriers...</option>
                      )}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="vessel">Vessel/Aircraft</label>
                    <input
                      id="vessel"
                      type="text"
                      className="form-control"
                      name="vessel"
                      value={formData.vessel}
                      onChange={onChange}
                      placeholder="Vessel or aircraft name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="flightNumber">Flight Number</label>
                    <input
                      id="flightNumber"
                      type="text"
                      className="form-control"
                      name="flightNumber"
                      value={formData.flightNumber}
                      onChange={onChange}
                      placeholder="Flight number"
                    />
                  </div>
                </div>
                
                <div className="form-section">
                  <h4>Tracking</h4>
                  
                  <div className="form-group">
                    <label htmlFor="trackingNumber">AWB/Tracking Number</label>
                    <input
                      id="trackingNumber"
                      type="text"
                      className="form-control"
                      name="trackingNumber"
                      value={formData.trackingNumber}
                      onChange={onChange}
                      placeholder="AWB or tracking number"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
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
                
                <div className="form-section full-width">
                  <h4>Schedule</h4>
                  
                  <div className="date-time-group">
                    <div className="form-group">
                      <label htmlFor="departureDate">Departure Date</label>
                      <input
                        id="departureDate"
                        type="date"
                        className="form-control"
                        name="departureDate"
                        value={formData.departureDate}
                        onChange={onChange}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="departureTime">Departure Time</label>
                      <input
                        id="departureTime"
                        type="time"
                        className="form-control"
                        name="departureTime"
                        value={formData.departureTime}
                        onChange={onChange}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="arrivalDate">Arrival Date</label>
                      <input
                        id="arrivalDate"
                        type="date"
                        className="form-control"
                        name="arrivalDate"
                        value={formData.arrivalDate}
                        onChange={onChange}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="arrivalTime">Arrival Time</label>
                      <input
                        id="arrivalTime"
                        type="time"
                        className="form-control"
                        name="arrivalTime"
                        value={formData.arrivalTime}
                        onChange={onChange}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="form-section full-width">
                  <div className="form-group">
                    <label htmlFor="notes">Notes</label>
                    <textarea
                      id="notes"
                      className="form-control"
                      name="notes"
                      value={formData.notes}
                      onChange={onChange}
                      placeholder="Additional notes"
                      rows="3"
                    ></textarea>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="history-container">
              <h4>Status History</h4>
              {changeLog.length > 0 ? (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Changed On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changeLog.map((entry, index) => (
                      <tr key={index} className={`status-${entry.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                        <td>{entry.status}</td>
                        <td>{formatTimestamp(entry.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-history">No status changes recorded yet.</p>
              )}
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {activeTab === 'details' && (
            <button 
              type="button" 
              className="btn btn-primary" 
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? 'Saving...' : (editingLeg ? 'Update Leg' : 'Add Leg')}
            </button>
          )}
        </div>
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