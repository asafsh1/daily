import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from '../../utils/axiosConfig';
import { toast } from 'react-toastify';
import Moment from 'react-moment';
import { getTrackingUrlSync, hasTracking } from '../../utils/trackingUtils';
import moment from 'moment';
import { generateUniqueId, ID_PREFIXES } from '../../utils/idGenerator';

// Initial form state for add/edit
const initialState = {
  from: '',
  to: '',
  carrier: '',
  legOrder: 0,
  departureDate: '',
  arrivalDate: '',
  trackingNumber: '',
  status: 'pending',
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
  const [success, setSuccess] = useState('');

  // Once the component mounts, fetch legs
  useEffect(() => {
    console.log("ShipmentLegs component mounted with shipmentId:", shipmentId);
    if (shipmentId) {
      // Add debouncing to prevent excessive calls
      const timer = setTimeout(() => {
        fetchLegs();
      }, 500);
      
      return () => clearTimeout(timer);
    }
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
  const fetchLegs = async (retryCount = 0) => {
    try {
      // Limit retries to avoid excessive API calls
      if (retryCount > 2) {
        console.log("Maximum retry attempts reached for legs, stopping.");
        setError("Unable to load shipment legs after multiple attempts");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      console.log("Fetching legs for shipment:", shipmentId);
      
      // Only fetch legs from the server if this is a real shipment ID (not a temp one)
      if (shipmentId && !shipmentId.toString().startsWith('temp-')) {
        try {
          // First try the new endpoint we just added
          console.log("Trying new legs endpoint:", `/api/shipments/${shipmentId}/legs`);
          const response = await axios.get(`/api/shipments/${shipmentId}/legs`);
          console.log("Response from legs endpoint:", response.data);
          
          if (Array.isArray(response.data) && response.data.length > 0) {
            // Normalize legs to handle field name differences
            const normalizedLegs = normalizeLegs(response.data);
            
            // Sort legs by legOrder
            const sortedLegs = [...normalizedLegs].sort((a, b) => 
              (a.legOrder || 0) - (b.legOrder || 0)
            );
            
            console.log(`Found and normalized ${sortedLegs.length} legs for shipment ${shipmentId}`);
            setLegs(sortedLegs);
            setError(null);
          } else {
            console.log("No legs found in response, trying full shipment endpoint");
            
            // Try getting the full shipment with populated legs
            const shipmentResponse = await axios.get(`/api/shipments/${shipmentId}`);
            console.log("Full shipment response:", shipmentResponse.data);
            
            if (shipmentResponse.data && shipmentResponse.data.legs && Array.isArray(shipmentResponse.data.legs)) {
              // Normalize legs to handle field name differences
              const normalizedLegs = normalizeLegs(shipmentResponse.data.legs);
              
              // Sort legs by legOrder
              const sortedLegs = [...normalizedLegs].sort((a, b) => 
                (a.legOrder || 0) - (b.legOrder || 0)
              );
              
              console.log(`Found and normalized ${sortedLegs.length} legs from full shipment data`);
              setLegs(sortedLegs);
              setError(null);
            } else {
              console.warn("No legs found in either API response");
              setLegs([]);
              setError("No legs found for this shipment");
            }
          }
        } catch (err) {
          console.error('API error fetching legs:', err);
          
          // Retry once with exponential backoff if it's a network error
          if (err.message === 'Network Error' && retryCount < 2) {
            console.log(`Retrying fetchLegs (attempt ${retryCount + 1}) after ${(retryCount + 1) * 1000}ms`);
            setTimeout(() => {
              fetchLegs(retryCount + 1);
            }, (retryCount + 1) * 1000);
            return;
          }
          
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
        shipment: shipmentId, // Ensure shipment ID is properly set
        legOrder: parseInt(formData.legOrder || 0, 10),
        departureDate: formData.departureDate ? moment(formData.departureDate).toISOString() : null,
        arrivalDate: formData.arrivalDate ? moment(formData.arrivalDate).toISOString() : null,
        legId: generateUniqueId(ID_PREFIXES.LEG)
      };
      
      console.log("Adding new leg with data:", formattedData);

      // Create change log entry
      const changeLogEntry = {
        timestamp: new Date(),
        description: `Added leg: ${formData.from} to ${formData.to}`
      };

      if (shipmentId.startsWith('temp-')) {
        // Add to local state for temporary shipments
        setLegs([
          ...legs,
          {
            ...formattedData,
            _id: generateUniqueId(ID_PREFIXES.LEG),
            changeLog: [changeLogEntry]
          }
        ]);
      } else {
        // Add to existing shipment
        const response = await axios.post(`/api/shipment-legs`, {
          ...formattedData,
          shipment: shipmentId,
          changeLog: [changeLogEntry]
        });
        
        console.log("Server response after adding leg:", response.data);
        
        // Refresh the legs list
        fetchLegs();
      }

      // Reset form state
      setFormData(initialState);
      setShowForm(false);
      setSuccess('Leg added successfully');
      
      // Clear success message after a delay
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error adding leg:', err);
      setError(`Failed to add leg: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle edit button click
  const editLeg = (leg) => {
    console.log('Editing leg:', leg);
    setEditingLeg(leg);
    
    // Convert dates to local format for the form
    const departureDate = leg.departureDate ? moment(leg.departureDate).format('YYYY-MM-DD') : '';
    const arrivalDate = leg.arrivalDate ? moment(leg.arrivalDate).format('YYYY-MM-DD') : '';
    
    setFormData({
      from: leg.from || '',
      to: leg.to || '',
      carrier: leg.carrier || '',
      legOrder: leg.legOrder || 0,
      departureDate: departureDate,
      arrivalDate: arrivalDate,
      trackingNumber: leg.trackingNumber || '',
      status: leg.status || 'pending',
      notes: leg.notes || ''
    });
    
    setShowForm(true);
  };

  // Helper function to get the display AWB/tracking number
  const getDisplayAwb = (leg) => {
    if (leg.trackingNumber) {
      return leg.trackingNumber;
    } else if (leg.awbNumber) {
      return leg.awbNumber;
    } else if (leg.mawbNumber) {
      return leg.mawbNumber;
    }
    return 'N/A';
  };

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.from) newErrors.from = 'Origin is required';
    if (!formData.to) newErrors.to = 'Destination is required';
    if (!formData.carrier) newErrors.carrier = 'Carrier is required';
    if (!formData.legOrder) newErrors.legOrder = 'Leg order is required';
    if (!formData.departureDate) newErrors.departureDate = 'Departure date is required';
    if (!formData.arrivalDate) newErrors.arrivalDate = 'Arrival date is required';
    
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
        shipment: shipmentId, // Ensure shipment ID is set
        legOrder: parseInt(formData.legOrder || 0, 10),
        departureDate: formData.departureDate ? moment(formData.departureDate).toISOString() : null,
        arrivalDate: formData.arrivalDate ? moment(formData.arrivalDate).toISOString() : null
      };

      console.log("Updating leg with data:", formattedData);

      // Create change log entry
      const changeLogEntry = {
        timestamp: new Date(),
        description: `Updated leg: ${formData.from} to ${formData.to}`
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
        const response = await axios.put(`/api/shipment-legs/${editingLeg._id}`, {
          ...formattedData,
          shipment: shipmentId,
          changeLog: [...(editingLeg.changeLog || []), changeLogEntry]
        });
        
        console.log("Server response after updating leg:", response.data);
        
        // Refresh the legs list
        fetchLegs();
      }

      // Reset form state
      setFormData(initialState);
      setEditingLeg(null);
      setShowForm(false);
      setSuccess('Leg updated successfully');
      
      // Clear success message after a delay
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating leg:', err);
      setError(`Failed to update leg: ${err.message}`);
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
        await axios.delete(`/api/shipment-legs/${legId}`);
        setLegs(legs.filter(leg => leg._id !== legId));
        
        // Show success message
        setSuccess('Leg deleted successfully');
        
        // Clear success message after a delay
        setTimeout(() => setSuccess(''), 3000);
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

  // Helper function to format status for display
  const getFormattedStatus = (status) => {
    if (!status) return 'Pending';
    
    // Capitalize and format status for display
    switch(status.toLowerCase()) {
      case 'pending':
        return 'Pending';
      case 'in-transit':
      case 'in transit':
        return 'In Transit';
      case 'delayed':
        return 'Delayed';
      case 'completed':
      case 'arrived':
        return 'Completed';
      case 'cancelled':
      case 'canceled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  // Helper function to map old leg fields to new field names and handle both formats
  const normalizeLegs = (legs) => {
    if (!Array.isArray(legs)) return [];
    
    return legs.map(leg => {
      // Create normalized leg that works with both old and new field structures
      return {
        _id: leg._id,
        legId: leg.legId || `LEG-${leg._id ? leg._id.substring(0, 8) : 'N/A'}`,
        shipment: leg.shipment,
        // Map both possible origin/destination fields
        from: leg.from || leg.origin || '',
        to: leg.to || leg.destination || '',
        // Map both possible carrier/flight fields
        carrier: leg.carrier || leg.flightNumber || leg.airline || '',
        // Map both possible date fields
        departureDate: leg.departureDate || leg.departureTime || null,
        arrivalDate: leg.arrivalDate || leg.arrivalTime || null,
        // Map tracking fields
        trackingNumber: leg.trackingNumber || leg.awbNumber || leg.mawbNumber || '',
        status: leg.status || 'pending',
        legOrder: leg.legOrder || 0,
        notes: leg.notes || '',
        // Preserve any other relevant fields
        changeLog: leg.changeLog || []
      };
    });
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
                  <td>{leg.from}</td>
                  <td>{leg.to}</td>
                  <td>{getDisplayAwb(leg)}</td>
                  <td>{leg.carrier || 'N/A'}</td>
                  <td>
                    {leg.departureDate ? (
                      <Moment format="DD/MM/YYYY HH:mm">{leg.departureDate}</Moment>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>
                    {leg.arrivalDate ? (
                      <Moment format="DD/MM/YYYY HH:mm">{leg.arrivalDate}</Moment>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>
                    {readOnly ? (
                      <span className={`status-badge status-${leg.status?.toLowerCase()?.replace(/\s+/g, '-') || 'unknown'}`}>
                        {getFormattedStatus(leg.status)}
                      </span>
                    ) : (
                      <select
                        className={`status-select status-${leg.status?.toLowerCase()?.replace(/\s+/g, '-') || 'unknown'}`}
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
                      <div className="leg-actions">
                        <button
                          type="button"
                          onClick={() => editLeg(leg)}
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
                        <h5 className="status-history-title">Status History</h5>
                        <ul className="status-history-list">
                          {[...leg.statusHistory].reverse().map((history, idx) => (
                            <li key={idx} className="status-history-item">
                              <span className={`status-badge small status-${history.status?.toLowerCase()?.replace(/\s+/g, '-') || 'unknown'}`}>
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
                    ) : (
                      <span className="text-muted">No history</span>
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
                <label htmlFor="from">Origin*</label>
                <input
                  type="text"
                  id="from"
                  name="from"
                  value={formData.from}
                  onChange={onChange}
                  required
                  className={errors.from ? 'form-control is-invalid' : 'form-control'}
                />
                {errors.from && <div className="invalid-feedback">{errors.from}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="to">Destination*</label>
                <input
                  type="text"
                  id="to"
                  name="to"
                  value={formData.to}
                  onChange={onChange}
                  required
                  className={errors.to ? 'form-control is-invalid' : 'form-control'}
                />
                {errors.to && <div className="invalid-feedback">{errors.to}</div>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="carrier">Carrier*</label>
                <input
                  type="text"
                  id="carrier"
                  name="carrier"
                  value={formData.carrier}
                  onChange={onChange}
                  required
                  className={errors.carrier ? 'form-control is-invalid' : 'form-control'}
                />
                {errors.carrier && <div className="invalid-feedback">{errors.carrier}</div>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="legOrder">Leg Order*</label>
                <input
                  type="number"
                  id="legOrder"
                  name="legOrder"
                  value={formData.legOrder}
                  onChange={onChange}
                  required
                  className={errors.legOrder ? 'form-control is-invalid' : 'form-control'}
                />
                {errors.legOrder && <div className="invalid-feedback">{errors.legOrder}</div>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="departureDate">Departure Date*</label>
                <input
                  type="datetime-local"
                  id="departureDate"
                  name="departureDate"
                  value={formData.departureDate}
                  onChange={onChange}
                  required
                  className={errors.departureDate ? 'form-control is-invalid' : 'form-control'}
                />
                {errors.departureDate && <div className="invalid-feedback">{errors.departureDate}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="arrivalDate">Arrival Date*</label>
                <input
                  type="datetime-local"
                  id="arrivalDate"
                  name="arrivalDate"
                  value={formData.arrivalDate}
                  onChange={onChange}
                  required
                  className={errors.arrivalDate ? 'form-control is-invalid' : 'form-control'}
                />
                {errors.arrivalDate && <div className="invalid-feedback">{errors.arrivalDate}</div>}
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="trackingNumber">Tracking Number</label>
              <input
                type="text"
                id="trackingNumber"
                name="trackingNumber"
                value={formData.trackingNumber}
                onChange={onChange}
                className="form-control"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={onChange}
                className="form-control"
              >
                <option value="pending">Pending</option>
                <option value="in transit">In Transit</option>
                <option value="arrived">Arrived</option>
                <option value="delayed">Delayed</option>
                <option value="canceled">Canceled</option>
              </select>
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