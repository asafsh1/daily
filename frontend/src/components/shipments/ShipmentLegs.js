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

  // Fetch legs on component mount and when shipmentId changes
  useEffect(() => {
    if (shipmentId) {
      fetchLegs();
    }
  }, [shipmentId]);
  
  // Function to normalize inconsistent leg data structure from API
  const normalizeLeg = (leg) => {
    if (!leg) return null;
    
    return {
      _id: leg._id || leg.id || `temp-${Date.now()}`,
      legOrder: leg.legOrder || leg.order || 0,
      from: leg.from || leg.origin || '',
      to: leg.to || leg.destination || '',
      carrier: leg.carrier || leg.airline || leg.shippingLine || '',
      departureDate: leg.departureDate || leg.departureTime || null,
      arrivalDate: leg.arrivalDate || leg.arrivalTime || null,
      trackingNumber: leg.trackingNumber || leg.awbNumber || leg.awb || '',
      status: leg.status || 'Not Started',
      notes: leg.notes || '',
      flight: leg.flight || leg.flightNumber || ''
    };
  };

  // Helper to sort legs by order
  const sortLegs = (legs) => {
    return [...legs].sort((a, b) => (Number(a.legOrder) || 0) - (Number(b.legOrder) || 0));
  };

  // Fetch legs data from API
  const fetchLegs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching shipment data for id: ${shipmentId}`);
      
      // First, try to get the shipment data which should include legs
      const shipmentResponse = await axios.get(`/api/shipments/${shipmentId}`);
      
      // If the shipment has legs attached, use those
      if (shipmentResponse.data && shipmentResponse.data.legs && 
          Array.isArray(shipmentResponse.data.legs) && 
          shipmentResponse.data.legs.length > 0) {
        
        console.log(`Found ${shipmentResponse.data.legs.length} legs in shipment response`);
        const normalizedLegs = shipmentResponse.data.legs.map(leg => normalizeLeg(leg)).filter(Boolean);
        setLegs(sortLegs(normalizedLegs));
      } else {
        // If no legs in shipment data, try dedicated leg endpoint
        console.log(`No legs in shipment data. Trying dedicated endpoint...`);
        
        try {
          const legsResponse = await axios.get(`/api/shipment-legs/shipment/${shipmentId}`);
          
          if (legsResponse.data && Array.isArray(legsResponse.data) && legsResponse.data.length > 0) {
            console.log(`Found ${legsResponse.data.length} legs from dedicated endpoint`);
            const normalizedLegs = legsResponse.data.map(leg => normalizeLeg(leg)).filter(Boolean);
            setLegs(sortLegs(normalizedLegs));
          } else {
            // Try alternative endpoint format as fallback
            const altLegsResponse = await axios.get(`/api/shipment-legs/${shipmentId}`);
            
            if (altLegsResponse.data && Array.isArray(altLegsResponse.data) && altLegsResponse.data.length > 0) {
              console.log(`Found ${altLegsResponse.data.length} legs from alternate endpoint`);
              const normalizedLegs = altLegsResponse.data.map(leg => normalizeLeg(leg)).filter(Boolean);
              setLegs(sortLegs(normalizedLegs));
            } else {
              console.log('No legs found in any endpoint');
              setLegs([]);
            }
          }
        } catch (legsError) {
          console.error('Error fetching from legs endpoint:', legsError);
          // Don't set error yet, just log it and continue
          
          // Try the last resort endpoint
          try {
            const lastResortResponse = await axios.get(`/api/shipments/${shipmentId}/legs`);
            
            if (lastResortResponse.data && Array.isArray(lastResortResponse.data) && lastResortResponse.data.length > 0) {
              console.log(`Found ${lastResortResponse.data.length} legs from last resort endpoint`);
              const normalizedLegs = lastResortResponse.data.map(leg => normalizeLeg(leg)).filter(Boolean);
              setLegs(sortLegs(normalizedLegs));
            } else {
              setLegs([]);
            }
          } catch (finalError) {
            console.error('All leg fetching attempts failed:', finalError);
            setLegs([]);
          }
        }
      }
    } catch (error) {
      console.error('Error in main fetchLegs function:', error);
      setError(`Failed to load shipment legs. Please try again.`);
      setLegs([]);
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
      trackingNumber: leg.trackingNumber || '',
      status: leg.status || 'pending',
      notes: leg.notes || ''
    });
    
    setShowForm(true);
  };

  // Format AWB for display
  const getDisplayAwb = (leg) => {
    return leg.awbNumber || leg.awb || 'N/A';
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

  // Format status for display
  const getFormattedStatus = (status) => {
    return status || 'Not Started';
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return moment(date).format('DD/MM/YYYY');
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
      </div>
    );
  }
  
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
                <td>{formatDate(leg.departureDate)}</td>
                <td>{formatDate(leg.arrivalDate)}</td>
                <td>
                  <span className={`status-badge status-${leg.status?.toLowerCase()?.replace(/\s+/g, '-') || 'unknown'}`}>
                    {leg.status || 'Not Started'}
                  </span>
                </td>
                {!readOnly && (
                  <td>
                    <button 
                      className="btn btn-sm btn-primary mr-1"
                      onClick={() => toast.info('Edit functionality not available in view mode')}
                    >
                      Edit
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
      
      {showForm && !readOnly && (
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
                <div className="form-group col-md-6">
                  <label>Departure Date</label>
                  <input
                    type="date"
                    className="form-control"
                    name="departureDate"
                    value={formData.departureDate}
                    onChange={onChange}
                  />
                </div>
                <div className="form-group col-md-6">
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
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
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
      )}
    </div>
  );
};

ShipmentLegs.propTypes = {
  shipmentId: PropTypes.string,
  readOnly: PropTypes.bool
};

export default ShipmentLegs; 