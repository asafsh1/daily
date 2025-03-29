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
      
      // Only fetch legs from the server if this is a real shipment ID (not a temp one)
      if (shipmentId && !shipmentId.toString().startsWith('temp-')) {
        const res = await axios.get(`/api/shipmentLegs/shipment/${shipmentId}`);
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
        const res = await axios.post('/api/shipmentLegs', legData);
        
        // Update the legs list with the new leg
        setLegs([...legs, res.data]);
        
        // Reset form
        setFormData({ ...initialState });
        setShowForm(false);
        setError(null);
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
    
    // Basic validation
    if (!formData.origin || !formData.destination || !formData.flightNumber || 
        !formData.mawbNumber || !formData.departureTime || !formData.arrivalTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingLeg) {
        // Update existing leg
        const res = await axios.put(
          `/api/shipment-legs/${shipmentId}/${editingLeg._id}`, 
          formData
        );
        
        setLegs(legs.map(leg => 
          leg._id === editingLeg._id ? res.data : leg
        ));
        
        toast.success('Leg updated successfully');
      } else {
        // Add new leg
        const res = await axios.post(
          `/api/shipment-legs/${shipmentId}`, 
          formData
        );
        
        setLegs([...legs, res.data]);
        toast.success('Leg added successfully');
      }
      
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error('Error saving leg:', err);
      toast.error(`Error: ${err.response?.data?.errors?.[0]?.msg || 'Something went wrong'}`);
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
        await axios.delete(`/api/shipmentLegs/${legId}`);
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
        const res = await axios.put(`/api/shipmentLegs/${shipmentId}/${legId}`, { status: newStatus });
        
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
    return Object.keys(newErrors).length === 0;
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
          <h4>{editMode ? 'Edit Leg' : 'Add New Leg'}</h4>
          <form>
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
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="flightNumber">Flight Number</label>
                <input
                  type="text"
                  id="flightNumber"
                  name="flightNumber"
                  value={formData.flightNumber}
                  onChange={onChange}
                  className="form-control"
                />
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
              />
            </div>
            
            <div className="form-actions">
              <button
                type="button"
                onClick={handleAddLeg}
                className="btn btn-primary"
              >
                {editMode ? 'Update Leg' : 'Add Leg'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setErrors({});
                }}
                className="btn btn-light"
              >
                Cancel
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