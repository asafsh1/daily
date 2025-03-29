import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from '../../utils/axiosConfig';
import { toast } from 'react-toastify';
import Moment from 'react-moment';

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
      fetchLegs();
    } else {
      setLegs([]);
      setLoading(false);
    }
  }, [shipmentId]);

  // Fetch legs for this shipment
  const fetchLegs = async () => {
    try {
      setLoading(true);
      console.log("Fetching legs for shipment:", shipmentId);
      
      // Only fetch legs from the server if this is a real shipment ID (not a temp one)
      if (shipmentId && !shipmentId.toString().startsWith('temp-')) {
        // Changed the endpoint URL to match the backend route
        const res = await axios.get(`/api/shipment-legs/${shipmentId}`);
        console.log("Legs response:", res.data);
        setLegs(res.data);
      } else {
        // For temporary IDs, just use the local state
        // We're not persisting these to the server until the shipment is created
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching shipment legs:', err);
      setLoading(false);
      setError('Failed to load shipment legs');
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
      if (!validateForm()) {
        return;
      }

      const legData = {
        ...formData,
        shipmentId,
        departureTime: new Date(formData.departureTime).toISOString(),
        arrivalTime: new Date(formData.arrivalTime).toISOString(),
        legOrder: legs.length + 1 // Set the order based on current number of legs
      };

      // For temporary shipments, just add to local state
      if (shipmentId.toString().startsWith('temp-')) {
        // Create a temporary ID
        const tempLegId = 'temp-leg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
        const newLeg = { ...legData, _id: tempLegId };
        setLegs([...legs, newLeg]);
        
        // Reset form
        setFormData({ ...initialState });
        setShowForm(false);
        setError(null);
      } else {
        // For real shipments, save to the server
        console.log("Adding leg to shipment:", shipmentId, legData);
        try {
          const res = await axios.post(`/api/shipment-legs/${shipmentId}`, legData);
          console.log("Add leg response:", res.data);
          
          // Update the legs list with the new leg
          setLegs([...legs, res.data]);
          toast.success('Leg added successfully');
          
          // Reset form
          setFormData({ ...initialState });
          setShowForm(false);
          setError(null);
        } catch (err) {
          console.error('Error in API call:', err);
          const errorMsg = err.response?.data?.errors?.[0]?.msg || 'Failed to add shipment leg';
          toast.error(errorMsg);
          setError(errorMsg);
        }
      }
    } catch (err) {
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
      departureTime: formatDate(leg.departureTime),
      arrivalTime: formatDate(leg.arrivalTime),
      status: leg.status,
      notes: leg.notes || ''
    });
    
    setEditingLeg(leg);
    setShowForm(true);
  };

  // Submit the form to add/update a leg
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If editing a leg, update it
    if (editingLeg) {
      if (!validateForm()) {
        return;
      }
      
      try {
        const updateData = {
          ...formData,
          departureTime: new Date(formData.departureTime).toISOString(),
          arrivalTime: new Date(formData.arrivalTime).toISOString()
        };
        
        console.log("Updating leg:", editingLeg._id, updateData);
        const res = await axios.put(
          `/api/shipment-legs/${shipmentId}/${editingLeg._id}`, 
          updateData
        );
        
        console.log("Update leg response:", res.data);
        setLegs(legs.map(leg => 
          leg._id === editingLeg._id ? res.data : leg
        ));
        
        toast.success('Leg updated successfully');
        setShowForm(false);
        resetForm();
      } catch (err) {
        console.error('Error updating leg:', err);
        const errorMsg = err.response?.data?.errors?.[0]?.msg || 'Failed to update leg';
        toast.error(errorMsg);
      }
    } else {
      // If adding a new leg
      handleAddLeg();
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

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    if (!formData.origin) newErrors.origin = 'Origin is required';
    if (!formData.destination) newErrors.destination = 'Destination is required';
    if (!formData.flightNumber) newErrors.flightNumber = 'Flight Number is required';
    if (!formData.mawbNumber) newErrors.mawbNumber = 'MAWB Number is required';
    if (!formData.departureTime) newErrors.departureTime = 'Departure Time is required';
    if (!formData.arrivalTime) newErrors.arrivalTime = 'Arrival Time is required';
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      // Display toast error with all validation errors
      const errorMsg = Object.values(newErrors).join(', ');
      toast.error(errorMsg);
      return false;
    }
    
    return true;
  };

  if (loading) {
    return <div>Loading legs...</div>;
  }

  return (
    <div className="shipment-legs">
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
                {!readOnly && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {legs.map((leg, index) => (
                <tr key={leg._id || index}>
                  <td>{leg.legOrder || index + 1}</td>
                  <td>{leg.origin}</td>
                  <td>{leg.destination}</td>
                  <td>{leg.awbNumber || 'N/A'}</td>
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
                      <button
                        onClick={() => handleDeleteLeg(leg._id)}
                        className="btn btn-danger btn-sm"
                        title="Delete Leg"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  )}
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
          <form onSubmit={handleSubmit}>
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
                <label htmlFor="awbNumber">AWB Number</label>
                <input
                  type="text"
                  id="awbNumber"
                  name="awbNumber"
                  value={formData.awbNumber}
                  onChange={onChange}
                  className="form-control"
                  placeholder="AWB number for display"
                />
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
                <label htmlFor="mawbNumber">MAWB Number*</label>
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
                type="submit" 
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