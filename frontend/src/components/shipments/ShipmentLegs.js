import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from '../../utils/axiosConfig';
import { toast } from 'react-toastify';
import Moment from 'react-moment';
import { getTrackingUrlSync, hasTracking } from '../../utils/trackingUtils';
import moment from 'moment';

// Define initialState to fix the reference errors
const initialState = {
  legOrder: '',
  origin: '',
  destination: '',
  flightNumber: '',
  mawbNumber: '',
  awbNumber: '',
  departureTime: '',
  arrivalTime: '',
  status: 'Pending',
  notes: ''
};

const ShipmentLegs = ({ shipmentId, readOnly = false }) => {
  const [legs, setLegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLeg, setEditingLeg] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(initialState);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [errors, setErrors] = useState({});

  // Load legs on component mount and when shipmentId changes
  useEffect(() => {
    if (shipmentId) {
      console.log(`ShipmentLegs component: Loading legs for shipment ID ${shipmentId}`);
      fetchLegs();
    } else {
      setLegs([]);
      setLoading(false);
    }
    
    // Clean up form when component unmounts
    return () => {
      setFormData(initialState);
      setEditingLeg(null);
      setShowForm(false);
    };
  }, [shipmentId]);
  
  // Periodically refresh legs data
  useEffect(() => {
    // Only set up refresh for real shipments, not temporary ones
    if (shipmentId && !shipmentId.toString().startsWith('temp-')) {
      const refreshInterval = setInterval(() => {
        console.log('Auto-refreshing legs data');
        fetchLegs();
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(refreshInterval);
    }
  }, [shipmentId]);

  // Fetch legs for this shipment
  const fetchLegs = async () => {
    try {
      setLoading(true);
      console.log("Fetching legs for shipment:", shipmentId);
      
      // Only fetch legs from the server if this is a real shipment ID (not a temp one)
      if (shipmentId && !shipmentId.toString().startsWith('temp-')) {
        try {
          // Changed the endpoint URL to match the backend route
          const res = await axios.get(`/api/shipment-legs/${shipmentId}`);
          console.log("Legs response:", res.data);
          if (Array.isArray(res.data)) {
            setLegs(res.data);
            setError(null);
          } else {
            console.error("Unexpected response format:", res.data);
            setError('Received invalid leg data format from server');
            setLegs([]);
          }
        } catch (err) {
          console.error('API error fetching legs:', err);
          setError(`Error fetching legs: ${err.message}`);
          setLegs([]);
        }
      } else {
        // For temporary IDs, just use the local state
        console.log('Using local state for temp shipment ID');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error in fetchLegs function:', err);
      setLoading(false);
      setError('Failed to load shipment legs');
      setLegs([]);
    }
  };

  // Handle form input changes
  const onChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData(initialState);
    setEditingLeg(null);
  };

  // Open form to add a new leg
  const handleAddLeg = async () => {
    try {
      console.log('handleAddLeg called');
      
      if (!validateForm()) {
        return;
      }

      // Set loading state
      setLoading(true);
      
      // Prepare leg data with proper format
      const legData = {
        ...formData,
        departureTime: new Date(formData.departureTime).toISOString(),
        arrivalTime: new Date(formData.arrivalTime).toISOString(),
        // Let the server auto-assign legOrder if not specified
        legOrder: formData.legOrder || legs.length + 1
      };

      console.log("Submitting leg data:", legData);

      // For temporary shipments, just add to local state
      if (shipmentId && shipmentId.toString().startsWith('temp-')) {
        // Create a temporary ID
        const tempLegId = 'temp-leg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
        const newLeg = { ...legData, _id: tempLegId };
        setLegs(prevLegs => [...prevLegs, newLeg]);
        
        // Reset form
        setFormData({ ...initialState });
        setShowForm(false);
        setError(null);
        setLoading(false);
        
        // Show success message
        toast.success('Leg added successfully');
      } else {
        // For real shipments, save to the server
        console.log("Adding leg to shipment:", shipmentId);
        
        try {
          // Make the API call with proper error handling
          const res = await axios.post(`/api/shipment-legs/${shipmentId}`, legData);
          console.log("Add leg response:", res.data);
          
          // Update the legs state with the new leg
          setLegs(prevLegs => [...prevLegs, res.data]);
          
          // Reset form and loading state
          setFormData({ ...initialState });
          setShowForm(false);
          setError(null);
          setLoading(false);
          
          // Show success message
          toast.success('Leg added successfully');
          
          // Reload all legs to ensure we have the latest data
          fetchLegs();
        } catch (err) {
          setLoading(false);
          console.error('Error in API call:', err);
          const errorMsg = err.response?.data?.errors?.[0]?.msg || 'Failed to add shipment leg';
          toast.error(errorMsg);
          setError(errorMsg);
        }
      }
    } catch (err) {
      setLoading(false);
      console.error('Error adding shipment leg:', err);
      setError('Failed to add shipment leg');
    }
  };

  // Open form to edit an existing leg
  const handleEditLeg = (leg) => {
    // Format dates for form inputs
    const formatDate = (dateString) => {
      return new Date(dateString).toISOString().slice(0, 16);
    };

    setFormData({
      legOrder: leg.legOrder,
      origin: leg.origin,
      destination: leg.destination,
      flightNumber: leg.flightNumber,
      mawbNumber: leg.mawbNumber,
      awbNumber: leg.awbNumber || leg.mawbNumber, // Use awbNumber if available, fallback to mawbNumber
      departureTime: formatDate(leg.departureTime),
      arrivalTime: formatDate(leg.arrivalTime),
      status: leg.status,
      notes: leg.notes || ''
    });
    
    setEditingLeg(leg);
    setShowForm(true);
    setEditMode(true);  // Set editMode to true to indicate we're editing
  };

  // Helper function to get AWB display for a leg
  const getDisplayAwb = (leg) => {
    if (!leg) return 'N/A';
    
    // Check various possible AWB fields
    const awb = leg.awbNumber || leg.mawbNumber || leg.awb || 'N/A';
    
    if (awb === 'N/A' || !hasTracking(awb)) {
      return awb;
    }
    
    // If we have a tracking URL, return a clickable link
    return (
      <a 
        href={getTrackingUrlSync(awb)} 
        target="_blank" 
        rel="noopener noreferrer"
        className="awb-tracking-link"
        title="Track shipment"
      >
        {awb} <i className="fas fa-external-link-alt fa-xs"></i>
      </a>
    );
  };

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.origin) newErrors.origin = 'Origin is required';
    if (!formData.destination) newErrors.destination = 'Destination is required';
    if (!formData.flightNumber) newErrors.flightNumber = 'Flight number is required';
    if (!formData.mawbNumber) newErrors.mawbNumber = 'MAWB number is required';
    if (!formData.departureTime) newErrors.departureTime = 'Departure time is required';
    if (!formData.arrivalTime) newErrors.arrivalTime = 'Arrival time is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent the event from bubbling up to parent forms
    
    console.log('Form submission handler called');
    
    if (!validateForm()) {
      return;
    }
    
    if (editingLeg) {
      handleUpdateLeg();
    } else {
      handleAddLeg();
    }
  };

  // Update an existing leg
  const handleUpdateLeg = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const formattedData = {
        ...formData,
        departureTime: formData.departureTime ? moment(formData.departureTime).toISOString() : null,
        arrivalTime: formData.arrivalTime ? moment(formData.arrivalTime).toISOString() : null
      };

      // Create change log entry
      const changeLogEntry = {
        timestamp: new Date(),
        description: `Updated leg: ${formData.airline} ${formData.flightNumber} - ${formData.origin} to ${formData.destination}`
      };

      if (shipmentId.startsWith('temp-')) {
        // Update local state for temporary shipments
        const updatedLegs = legs.map(leg => 
          leg._id === editingLeg._id 
            ? { ...formattedData, _id: leg._id, changeLog: [...(leg.changeLog || []), changeLogEntry] }
            : leg
        );
        setLegs(updatedLegs);
      } else {
        // Update real shipment
        const response = await axios.put(`/api/shipments/${shipmentId}/legs/${editingLeg._id}`, {
          ...formattedData,
          changeLog: [...(editingLeg.changeLog || []), changeLogEntry]
        });

        if (response.data.success) {
          const updatedLegs = legs.map(leg => 
            leg._id === editingLeg._id 
              ? { ...response.data.leg, changeLog: [...(leg.changeLog || []), changeLogEntry] }
              : leg
          );
          setLegs(updatedLegs);
          toast.success('Leg updated successfully');
        } else {
          throw new Error(response.data.message || 'Failed to update leg');
        }
      }

      setEditingLeg(null);
      setFormData({
        airline: '',
        flightNumber: '',
        origin: '',
        destination: '',
        departureTime: '',
        arrivalTime: '',
        awbNumber: '',
        status: 'Pending'
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error updating leg:', error);
      toast.error(error.response?.data?.message || 'Failed to update leg');
    } finally {
      setLoading(false);
    }
  };

  // Delete a leg
  const handleDeleteLeg = async (legId) => {
    try {
      // For temporary legs, just remove from local state
      if (shipmentId.toString().startsWith('temp-') || legId.toString().startsWith('temp-leg-')) {
        setLegs(legs.filter(leg => leg._id !== legId));
      } else {
        // For real legs, delete from the server
        console.log("Deleting leg:", legId);
        await axios.delete(`/api/shipment-legs/${shipmentId}/${legId}`);
        setLegs(legs.filter(leg => leg._id !== legId));
      }
    } catch (err) {
      console.error('Error deleting shipment leg:', err);
      setError('Failed to delete shipment leg');
    }
  };

  // Handle leg status change
  const handleLegStatusChange = async (legId, newStatus) => {
    try {
      // For temporary legs, just update local state
      if (shipmentId.toString().startsWith('temp-') || legId.toString().startsWith('temp-leg-')) {
        setLegs(legs.map(leg => 
          leg._id === legId ? { ...leg, status: newStatus } : leg
        ));
      } else {
        // For real legs, update on the server
        // Fix the endpoint URL to match the backend route
        const res = await axios.put(`/api/shipment-legs/${shipmentId}/${legId}`, { status: newStatus });
        
        // Update local state
        setLegs(legs.map(leg => 
          leg._id === legId ? { ...leg, status: newStatus } : leg
        ));
        
        toast.success('Leg status updated');
      }
    } catch (err) {
      console.error('Error updating leg status:', err);
      setError('Failed to update leg status');
    }
  };

  // Cancel form editing
  const handleCancel = () => {
    setShowForm(false);
    resetForm();
  };

  if (loading) {
    return <div>Loading legs...</div>;
  }

  return (
    <div className="shipment-legs">
      <style>
        {`
          .change-log {
            max-height: 150px;
            overflow-y: auto;
            font-size: 0.85rem;
          }
          .change-entry {
            padding: 4px 0;
            border-bottom: 1px solid #eee;
          }
          .change-entry:last-child {
            border-bottom: none;
          }
          .change-entry small {
            display: block;
            color: #666;
            margin-bottom: 2px;
          }
          .change-entry div {
            color: #333;
          }
        `}
      </style>
      <div className="legs-header">
        <h3>Shipment Legs</h3>
        {!readOnly && (
          <button 
            onClick={() => setShowForm(true)} 
            className="btn btn-primary"
            disabled={showForm}
          >
            <i className="fas fa-plus"></i> Add Leg
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {loading ? (
        <div className="spinner-container">
          <div className="spinner"></div>
        </div>
      ) : legs.length === 0 ? (
        <div className="no-legs-message">
          <p>No legs have been added to this shipment yet.</p>
        </div>
      ) : (
        <div className="legs-list">
          <table className="table legs-table">
            <thead>
              <tr>
                <th>Leg</th>
                <th>Origin</th>
                <th>Destination</th>
                <th>AWB</th>
                <th>Flight #</th>
                <th>Departure</th>
                <th>Arrival</th>
                <th>Status</th>
                <th>Actions</th>
                <th>Change Log</th>
              </tr>
            </thead>
            <tbody>
              {legs.map((leg, index) => (
                <tr key={leg._id || index}>
                  <td>{leg.legOrder || index + 1}</td>
                  <td>{leg.origin}</td>
                  <td>{leg.destination}</td>
                  <td>{getDisplayAwb(leg)}</td>
                  <td>{leg.flightNumber || 'N/A'}</td>
                  <td>
                    <Moment format="DD/MM/YYYY HH:mm">
                      {leg.departureTime}
                    </Moment>
                  </td>
                  <td>
                    <Moment format="DD/MM/YYYY HH:mm">
                      {leg.arrivalTime}
                    </Moment>
                  </td>
                  <td>
                    {readOnly ? (
                      <span className={`status-badge status-${leg.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {leg.status}
                      </span>
                    ) : (
                      <select
                        className={`status-select status-${leg.status.toLowerCase().replace(/\s+/g, '-')}`}
                        value={leg.status}
                        onChange={(e) => handleLegStatusChange(leg._id, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Transit">In Transit</option>
                        <option value="Arrived">Arrived</option>
                        <option value="Delayed">Delayed</option>
                        <option value="Canceled">Canceled</option>
                      </select>
                    )}
                  </td>
                  {!readOnly && (
                    <td>
                      <div className="leg-details">
                        <div className="leg-status">
                          <span className={`status-badge status-${leg.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {leg.status}
                          </span>
                        </div>
                        
                        <div className="leg-actions">
                          <button 
                            type="button" 
                            onClick={() => handleEditLeg(leg)}
                            className="btn btn-sm btn-primary"
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteLeg(leg._id)}
                            className="btn btn-sm btn-danger"
                          >
                            <i className="fas fa-trash"></i> Delete
                          </button>
                        </div>
                      </div>
                      
                      {/* Status History Log */}
                      {leg.statusHistory && leg.statusHistory.length > 0 && (
                        <div className="status-history">
                          <h5 className="status-history-title">Status History</h5>
                          <ul className="status-history-list">
                            {[...leg.statusHistory].reverse().map((history, idx) => (
                              <li key={idx} className="status-history-item">
                                <span className={`status-badge small status-${history.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                  {history.status}
                                </span>
                                <span className="status-timestamp">
                                  <Moment format="DD/MM/YYYY HH:mm">
                                    {history.timestamp}
                                  </Moment>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </td>
                  )}
                  <td>
                    {leg.changeLog && leg.changeLog.length > 0 ? (
                      <div className="change-log">
                        {leg.changeLog.map((change, index) => (
                          <div key={index} className="change-entry">
                            <small className="text-muted">
                              {Moment(change.timestamp).format('DD/MM/YYYY HH:mm')}
                            </small>
                            <div>{change.description}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">No changes</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leg form for adding new legs */}
      {showForm && !readOnly && (
        <div className="leg-form">
          <h4>{editingLeg ? 'Edit Leg' : 'Add New Leg'}</h4>
          <form onSubmit={(e) => handleSubmit(e)}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="origin">Origin*</label>
                <input
                  type="text"
                  id="origin"
                  name="origin"
                  value={formData.origin}
                  onChange={onChange}
                  required
                  className={errors.origin ? 'form-control is-invalid' : 'form-control'}
                />
                {errors.origin && <div className="invalid-feedback">{errors.origin}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="destination">Destination*</label>
                <input
                  type="text"
                  id="destination"
                  name="destination"
                  value={formData.destination}
                  onChange={onChange}
                  required
                  className={errors.destination ? 'form-control is-invalid' : 'form-control'}
                />
                {errors.destination && <div className="invalid-feedback">{errors.destination}</div>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="mawbNumber">MAWB/AWB Number*</label>
                <input
                  type="text"
                  id="mawbNumber"
                  name="mawbNumber"
                  value={formData.mawbNumber}
                  onChange={onChange}
                  required
                  className={errors.mawbNumber ? 'form-control is-invalid' : 'form-control'}
                />
                {errors.mawbNumber && <div className="invalid-feedback">{errors.mawbNumber}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="flightNumber">Flight Number*</label>
                <input
                  type="text"
                  id="flightNumber"
                  name="flightNumber"
                  value={formData.flightNumber}
                  onChange={onChange}
                  required
                  className={errors.flightNumber ? 'form-control is-invalid' : 'form-control'}
                />
                {errors.flightNumber && <div className="invalid-feedback">{errors.flightNumber}</div>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={onChange}
                  className="form-control"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Arrived">Arrived</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Canceled">Canceled</option>
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="departureTime">Departure Time*</label>
                <input
                  type="datetime-local"
                  id="departureTime"
                  name="departureTime"
                  value={formData.departureTime}
                  onChange={onChange}
                  required
                  className={errors.departureTime ? 'form-control is-invalid' : 'form-control'}
                />
                {errors.departureTime && <div className="invalid-feedback">{errors.departureTime}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="arrivalTime">Arrival Time*</label>
                <input
                  type="datetime-local"
                  id="arrivalTime"
                  name="arrivalTime"
                  value={formData.arrivalTime}
                  onChange={onChange}
                  required
                  className={errors.arrivalTime ? 'form-control is-invalid' : 'form-control'}
                />
                {errors.arrivalTime && <div className="invalid-feedback">{errors.arrivalTime}</div>}
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={onChange}
                className="form-control"
                rows="3"
              ></textarea>
            </div>
            
            <div className="form-buttons">
              <button 
                type="button" 
                onClick={handleCancel}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={(e) => handleSubmit(e)}
                className="btn btn-primary"
              >
                {editingLeg ? 'Update Leg' : 'Add Leg'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

ShipmentLegs.propTypes = {
  shipmentId: PropTypes.string,
  readOnly: PropTypes.bool
};

export default ShipmentLegs; 