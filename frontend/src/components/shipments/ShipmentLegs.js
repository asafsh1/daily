import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from '../../utils/axiosConfig';
import { toast } from 'react-toastify';
import Moment from 'react-moment';
import { getTrackingUrlSync, hasTracking } from '../../utils/trackingUtils';
import moment from 'moment';
import { generateUniqueId, ID_PREFIXES } from '../../utils/idGenerator';
import './ShipmentLegs.css';

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
  vessel: ''
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

  // Fetch legs on component mount and when shipmentId changes
  useEffect(() => {
    if (shipmentId) {
      fetchLegs();
    }
  }, [shipmentId]);
  
  // Function to normalize inconsistent leg data structure from API
  const normalizeLeg = (leg) => {
    if (!leg) return null;
    
    console.log("Normalizing leg:", leg);
    
    // Extract date and time parts
    const extractDateTime = (datetime) => {
      if (!datetime) return { date: '', time: '' };
      const date = moment(datetime).format('YYYY-MM-DD');
      const time = moment(datetime).format('HH:mm');
      return { date, time };
    };
    
    const departure = extractDateTime(leg.departureDate || leg.departureTime);
    const arrival = extractDateTime(leg.arrivalDate || leg.arrivalTime);
    
    // Create a standard leg object with all possible field mappings
    return {
      _id: leg._id || leg.id || `temp-${Date.now()}`,
      legOrder: leg.legOrder || leg.order || 0,
      from: leg.from || leg.origin || '',
      to: leg.to || leg.destination || '',
      carrier: leg.carrier || leg.airline || leg.shippingLine || '',
      departureDate: departure.date,
      departureTime: departure.time,
      arrivalDate: arrival.date,
      arrivalTime: arrival.time,
      trackingNumber: leg.trackingNumber || leg.awbNumber || leg.awb || '',
      status: leg.status || 'Pending',
      notes: leg.notes || '',
      flight: leg.flight || leg.flightNumber || '',
      vessel: leg.vessel || ''
    };
  };

  // Helper to sort legs by order
  const sortLegs = (legs) => {
    return [...legs].sort((a, b) => (Number(a.legOrder) || 0) - (Number(b.legOrder) || 0));
  };

  // Debug logger for API responses
  const logResponse = (source, data) => {
    console.log(`[DEBUG ${source}]`, {
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : 'not an array',
      data: data 
    });
  };

  // Fetch legs data from API - try all possible endpoints
  const fetchLegs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching legs for shipment ID: ${shipmentId}`);
      
      // First attempt - use the debugging endpoint to find legs in any possible location
      try {
        const debugResponse = await axios.get(`/api/shipment-legs/debug/${shipmentId}`);
        console.log('Debug response:', debugResponse.data);
        
        if (debugResponse.data && debugResponse.data.uniqueLegs && 
            Array.isArray(debugResponse.data.uniqueLegs) && 
            debugResponse.data.uniqueLegs.length > 0) {
              
          // We found legs through the debugger - use them
          console.log(`Debug API found ${debugResponse.data.uniqueLegs.length} legs`);
          const normalizedLegs = debugResponse.data.uniqueLegs.map(leg => normalizeLeg(leg)).filter(Boolean);
          setLegs(sortLegs(normalizedLegs));
          setLoading(false);
          return;
        } else {
          console.log('Debug API found no legs');
        }
      } catch (debugErr) {
        console.error('Error using debug endpoint:', debugErr);
      }
      
      // Method 1: Try direct shipment-legs endpoint 
      try {
        const response = await axios.get(`/api/shipment-legs/shipment/${shipmentId}`);
        logResponse("Direct API", response.data);
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log(`Found ${response.data.length} legs in response`);
          const normalizedLegs = response.data.map(leg => normalizeLeg(leg)).filter(Boolean);
          setLegs(sortLegs(normalizedLegs));
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log("Method 1 failed:", err.message);
      }
      
      // Method 2: Try getting shipment and extracting legs
      try {
        const response = await axios.get(`/api/shipments/${shipmentId}`);
        logResponse("Shipment API", response.data);
        
        if (response.data && response.data.legs && 
            Array.isArray(response.data.legs) && response.data.legs.length > 0) {
              
          // Check if the legs are objects with data or just references
          const firstLeg = response.data.legs[0];
          const areEmbeddedLegs = firstLeg && (firstLeg.from || firstLeg.origin);
          
          if (areEmbeddedLegs) {
            console.log(`Found ${response.data.legs.length} embedded legs in shipment`);
            const normalizedLegs = response.data.legs.map(leg => normalizeLeg(leg)).filter(Boolean);
            setLegs(sortLegs(normalizedLegs));
            setLoading(false);
            return;
          } else {
            // These are leg references - we need to fetch each one
            console.log(`Found ${response.data.legs.length} leg references in shipment`);
            
            const legFetches = response.data.legs.map(legId => {
              const id = typeof legId === 'string' ? legId : legId._id;
              return axios.get(`/api/shipment-legs/${id}`)
                .then(res => res.data)
                .catch(err => {
                  console.error(`Failed to fetch leg ${id}:`, err);
                  return null;
                });
            });
            
            const legResults = await Promise.all(legFetches);
            const validLegs = legResults.filter(Boolean);
            
            if (validLegs.length > 0) {
              console.log(`Fetched ${validLegs.length} legs from references`);
              const normalizedLegs = validLegs.map(leg => normalizeLeg(leg)).filter(Boolean);
              setLegs(sortLegs(normalizedLegs));
              setLoading(false);
              return;
            }
          }
          }
        } catch (err) {
        console.log("Method 2 failed:", err.message);
      }
      
      // Method 3: Try alternative shipment-legs endpoint
      try {
        const response = await axios.get(`/api/shipment-legs/${shipmentId}`);
        logResponse("Alt API", response.data);
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log(`Found ${response.data.length} legs with alt endpoint`);
          const normalizedLegs = response.data.map(leg => normalizeLeg(leg)).filter(Boolean);
          setLegs(sortLegs(normalizedLegs));
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log("Method 3 failed:", err.message);
      }
      
      // Method 4: Try more specific endpoint format
      try {
        const response = await axios.get(`/api/shipments/${shipmentId}/legs`);
        logResponse("Specific API", response.data);
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log(`Found ${response.data.length} legs with specific endpoint`);
          const normalizedLegs = response.data.map(leg => normalizeLeg(leg)).filter(Boolean);
          setLegs(sortLegs(normalizedLegs));
      setLoading(false);
          return;
        }
    } catch (err) {
        console.log("Method 4 failed:", err.message);
      }
      
      // Manual method as last resort
      try {
        // Try to create legs based on shipment data if no legs are found
        const shipmentResponse = await axios.get(`/api/shipments/${shipmentId}`);
        
        if (shipmentResponse.data && 
            shipmentResponse.data.origin && 
            shipmentResponse.data.destination) {
          
          // We can create a basic leg from the shipment data
          console.log('Creating default leg from shipment data');
          
          const syntheticLeg = {
            _id: `synthetic-${Date.now()}`,
            from: shipmentResponse.data.origin,
            to: shipmentResponse.data.destination,
            carrier: shipmentResponse.data.carrier || '',
            legOrder: 1,
            departureDate: shipmentResponse.data.etd || null,
            arrivalDate: shipmentResponse.data.eta || null,
            status: 'Not Started',
            synthetic: true // Mark as synthetic so we know it's not from the database
          };
          
          // We don't save this to the database - it's just for display
          setLegs([syntheticLeg]);
      setLoading(false);
          return;
        }
      } catch (err) {
        console.log("Manual creation method failed:", err.message);
      }
      
      console.log("All methods failed to find legs");
      setLegs([]);
      
    } catch (error) {
      console.error('Error fetching legs:', error);
      setError(`Failed to load shipment legs: ${error.message}`);
    } finally {
      setLoading(false);
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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form submission handler called');
    
    if (!validateForm()) {
      return;
    }
    
    if (editingLeg) {
      // Call update directly without the e parameter
      await handleUpdateLeg();
    } else {
      // Call add directly without the e parameter
      await handleAddLeg();
    }
  };

  // Add a new leg
  const handleAddLeg = async () => {
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

      if (shipmentId.toString().startsWith('temp-')) {
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
        // Use the direct endpoint to add leg to the shipment
        try {
          // First try the direct add-to-shipment endpoint which is more reliable
          console.log(`Using direct add-to-shipment endpoint for shipmentId: ${shipmentId}`);
          const response = await axios.post(`/api/shipment-legs/add-to-shipment/${shipmentId}`, formattedData);
          console.log("Server response from direct add endpoint:", response.data);
        } catch (directAddError) {
          // Fallback to the original endpoint if the direct one fails
          console.warn("Direct leg add failed, using fallback endpoint:", directAddError.message);
          const response = await axios.post(`/api/shipment-legs`, {
          ...formattedData,
            shipment: shipmentId,
          changeLog: [changeLogEntry]
        });
          console.log("Server response from fallback endpoint:", response.data);
        }
        
        // Always refresh the legs list after adding
        await fetchLegs();
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

  // Update an existing leg
  const handleUpdateLeg = async () => {
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

      if (shipmentId.toString().startsWith('temp-')) {
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
      trackingNumber: leg.trackingNumber || leg.awbNumber || '',
      status: leg.status || 'Pending',
      notes: leg.notes || '',
      vessel: leg.vessel || ''
    });
    
    setShowForm(true);
  };

  // Format AWB for display
  const getDisplayAwb = (leg) => {
    return leg.awbNumber || leg.trackingNumber || leg.awb || 'N/A';
  };

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.from) newErrors.from = 'Origin is required';
    if (!formData.to) newErrors.to = 'Destination is required';
    if (!formData.carrier) newErrors.carrier = 'Carrier is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Delete a leg
  const handleDeleteLeg = async (legId) => {
    if (!window.confirm('Are you sure you want to delete this leg?')) {
      return;
    }
    
    try {
      // For temporary legs, just remove from local state
      if (shipmentId.toString().startsWith('temp-') || legId.toString().startsWith('temp-leg-')) {
        setLegs(legs.filter(leg => leg._id !== legId));
      } else {
        // For real legs, delete from the server
        console.log("Deleting leg:", legId);
        await axios.delete(`/api/shipment-legs/${legId}`);
        
        // Update local state too (for immediate feedback)
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
        const res = await axios.put(`/api/shipment-legs/${legId}/status`, { status: newStatus });
        
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

  // Format date for display - include time if available
  const formatDate = (date, time) => {
    if (!date) return 'N/A';
    
    // Create base formatted date
    const formattedDate = moment(date).format('DD/MM/YYYY');
    
    // Add time if available
    if (time) {
      return `${formattedDate} ${time}`;
    }
    
    return formattedDate;
  };

  // Display error message
  if (error) {
    return (
      <div className="alert alert-danger mt-3">
        {error}
        <button 
          className="btn btn-sm btn-outline-danger ml-2" 
          onClick={() => { setError(null); fetchLegs(); }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Render loading state
  if (loading) {
    return <div className="text-center p-4">Loading shipment legs...</div>;
  }
  
  // Render success message if present
  const successMessage = success ? (
    <div className="alert alert-success mt-2">{success}</div>
  ) : null;
  
  // Render no legs message
  if (!legs || legs.length === 0) {
  return (
      <div>
        {successMessage}
        <div className="alert alert-info mt-3">
          No legs have been added to this shipment yet.
        </div>
        {!readOnly && (
          <button 
            className="btn btn-primary mt-2" 
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            Add Leg
          </button>
        )}
        {showForm && !readOnly && renderForm()}
      </div>
    );
  }
  
  // Helper to render the form
  const renderForm = () => {
    return (
      <div className="card mt-3">
        <div className="card-header">
          {editingLeg ? 'Edit Leg' : 'Add New Leg'}
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group col-md-6">
                <label>From</label>
                <input
                  type="text"
                  className={`form-control ${errors.from ? 'is-invalid' : ''}`}
                  name="from"
                  value={formData.from}
                  onChange={onChange}
                  placeholder="Origin"
                />
                {errors.from && <div className="invalid-feedback">{errors.from}</div>}
              </div>
              <div className="form-group col-md-6">
                <label>To</label>
                <input
                  type="text"
                  className={`form-control ${errors.to ? 'is-invalid' : ''}`}
                  name="to"
                  value={formData.to}
                  onChange={onChange}
                  placeholder="Destination"
                />
                {errors.to && <div className="invalid-feedback">{errors.to}</div>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group col-md-6">
                <label>Carrier</label>
                <input
                  type="text"
                  className={`form-control ${errors.carrier ? 'is-invalid' : ''}`}
                  name="carrier"
                  value={formData.carrier}
                  onChange={onChange}
                  placeholder="Airline/Carrier"
                />
                {errors.carrier && <div className="invalid-feedback">{errors.carrier}</div>}
              </div>
              <div className="form-group col-md-6">
                <label>Leg Order</label>
                <input
                  type="number"
                  className="form-control"
                  name="legOrder"
                  value={formData.legOrder}
                  onChange={onChange}
                  placeholder="Leg Order"
                  min="0"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group col-md-3">
                <label>Departure Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="departureDate"
                  value={formData.departureDate}
                  onChange={onChange}
                />
              </div>
              <div className="form-group col-md-3">
                <label>Departure Time</label>
                <input
                  type="time"
                  className="form-control"
                  name="departureTime"
                  value={formData.departureTime}
                  onChange={onChange}
                />
              </div>
              <div className="form-group col-md-3">
                <label>Arrival Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="arrivalDate"
                  value={formData.arrivalDate}
                  onChange={onChange}
                />
              </div>
              <div className="form-group col-md-3">
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
            
            <div className="form-row">
              <div className="form-group col-md-6">
                <label>AWB / Tracking Number</label>
                <input
                  type="text"
                  className="form-control"
                  name="trackingNumber"
                  value={formData.trackingNumber}
                  onChange={onChange}
                  placeholder="AWB/Tracking Number"
                />
              </div>
              <div className="form-group col-md-6">
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
            
            <div className="form-group">
              <label>Vessel</label>
              <input
                type="text"
                className="form-control"
                name="vessel"
                value={formData.vessel || ''}
                onChange={onChange}
                placeholder="Vessel name (if applicable)"
              />
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
            
            <div className="form-group">
              <button type="submit" className="btn btn-primary mr-2">
                {editingLeg ? 'Update Leg' : 'Add Leg'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
  // Render legs table
  return (
    <div className="shipment-legs mt-3">
      {successMessage}
      <h3>Shipment Legs ({legs.length})</h3>
      
      <div className="table-responsive">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Leg #</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Carrier</th>
              <th>Flight/Vessel</th>
              <th>AWB/Tracking</th>
              <th>Departure</th>
              <th>Arrival</th>
              <th>Status</th>
              {!readOnly && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {legs.map((leg, index) => (
              <tr key={leg._id || index}>
                <td>{leg.legOrder || index + 1}</td>
                <td>{leg.from || 'N/A'}</td>
                <td>{leg.to || 'N/A'}</td>
                <td>{leg.carrier || 'N/A'}</td>
                <td>{leg.flight || 'N/A'}</td>
                <td>{leg.trackingNumber || leg.awbNumber || leg.awb || 'N/A'}</td>
                <td>{formatDate(leg.departureDate, leg.departureTime)}</td>
                <td>{formatDate(leg.arrivalDate, leg.arrivalTime)}</td>
                <td>
                  <span className={`status-badge status-${leg.status?.toLowerCase()?.replace(/\s+/g, '-') || 'unknown'}`}>
                    {leg.status || 'Not Started'}
                  </span>
                </td>
                {!readOnly && (
                  <td>
                    <button 
                      className="btn btn-sm btn-primary mr-1"
                      onClick={() => editLeg(leg)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-danger" 
                      onClick={() => handleDeleteLeg(leg._id)}
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {!readOnly && !showForm && (
        <button 
          className="btn btn-primary mt-2" 
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Add Leg
        </button>
      )}
      
      {showForm && !readOnly && renderForm()}
    </div>
  );
};

ShipmentLegs.propTypes = {
  shipmentId: PropTypes.string,
  readOnly: PropTypes.bool
};

export default ShipmentLegs; 