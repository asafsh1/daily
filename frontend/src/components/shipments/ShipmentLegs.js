import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from '../../utils/axiosConfig';
import { toast } from 'react-toastify';
import Moment from 'react-moment';
import { getTrackingUrlSync, hasTracking } from '../../utils/trackingUtils';
import moment from 'moment';
import { generateUniqueId, ID_PREFIXES } from '../../utils/idGenerator';

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

  // Add a new leg
  const handleAddLeg = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const formattedData = {
        ...formData,
        departureTime: formData.departureTime ? moment(formData.departureTime).toISOString() : null,
        arrivalTime: formData.arrivalTime ? moment(formData.arrivalTime).toISOString() : null,
        legId: generateUniqueId(ID_PREFIXES.LEG)
      };

      // Create change log entry
      const changeLogEntry = {
        timestamp: new Date(),
        description: `Added leg: ${formData.airline} ${formData.flightNumber} - ${formData.origin} to ${formData.destination}`
      };

      if (shipmentId.startsWith('temp-')) {
        // Store locally for new shipments
        setLegs([
          ...legs, 
          { 
            ...formattedData, 
            _id: `temp-leg-${Date.now()}`,
            changeLog: [changeLogEntry]
          }
        ]);
      } else {
        // Add to existing shipment
        const response = await axios.post(`/api/shipments/${shipmentId}/legs`, {
          ...formattedData,
          changeLog: [changeLogEntry]
        });

        if (response.data.success) {
          setLegs([...legs, response.data.leg]);
          toast.success('Leg added successfully');
        } else {
          throw new Error(response.data.message || 'Failed to add leg');
        }
      }

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
          <table className="shipment-legs-table">
            <thead>
              <tr>
                <th>Leg</th>
                <th>Leg ID</th>
                <th>Origin</th>
                <th>Destination</th>
                <th>AWB</th>
                <th>Flight #</th>
                <th>Departure</th>
                <th>Arrival</th>
                <th>Status</th>
                <th>Actions</th>
                <th>Change Log</th>
                <th>Status History</th>
              </tr>
            </thead>
            <tbody>
              {legs.map((leg, index) => (
                <tr key={leg._id || index}>
                  <td>{index + 1}</td>
                  <td>{leg.legId || `LEG-${leg._id ? leg._id.substring(0, 8) : 'N/A'}`}</td>
                  <td>{leg.origin}</td>
                  <td>{leg.destination}</td>
                  <td>
                    {leg.awbNumber && hasTracking(leg.awbNumber) ? (
                      <a
                        href={getTrackingUrlSync(leg.awbNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tracking-link"
                      >
                        {leg.awbNumber} <i className="fas fa-external-link-alt"></i>
                      </a>
                    ) : (
                      leg.awbNumber || 'N/A'
                    )}
                  </td>
                  <td>{leg.flightNumber || 'N/A'}</td>
                  <td>
                    {leg.departureTime ? (
                      <Moment format="DD/MM/YYYY HH:mm">{leg.departureTime}</Moment>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>
                    {leg.arrivalTime ? (
                      <Moment format="DD/MM/YYYY HH:mm">{leg.arrivalTime}</Moment>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>
                    {readOnly ? (
                      <div className={`status-pill ${leg.status?.toLowerCase() || 'unknown'}`}>
                        {leg.status || 'Unknown'}
                      </div>
                    ) : (
                      <select
                        className={`status-select ${leg.status?.toLowerCase() || 'unknown'}`}
                        value={leg.status || 'Not Started'}
                        onChange={(e) => handleLegStatusChange(leg._id, e.target.value)}
                      >
                        {['Not Started', 'In Progress', 'Departed', 'In Transit', 'Arrived', 'Delivered', 'Delayed', 'Cancelled'].map(
                          (status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          )
                        )}
                      </select>
                    )}
                  </td>
                  <td>
                    {!readOnly && (
                      <>
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => handleEditLeg(leg)}
                          title="Edit Leg"
                        >
                          <i className="fas fa-edit"></i> Edit
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDeleteLeg(leg._id)}
                          title="Delete Leg"
                        >
                          <i className="fas fa-trash"></i> Delete
                        </button>
                      </>
                    )}
                  </td>
                  <td>
                    {leg.changeLog && leg.changeLog.length > 0
                      ? leg.changeLog[leg.changeLog.length - 1].description || 'No changes'
                      : 'No changes'}
                  </td>
                  <td>
                    {leg.statusHistory && leg.statusHistory.length > 0 ? (
                      <div className="status-history">
                        {leg.statusHistory.map((statusRecord, idx) => (
                          <div key={idx} className="status-record">
                            <div className={`status-pill ${statusRecord.status?.toLowerCase() || 'unknown'}`}>
                              {statusRecord.status}
                            </div>
                            <div className="status-timestamp">
                              <Moment format="DD/MM/YYYY HH:mm">{statusRecord.timestamp}</Moment>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      'No history'
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