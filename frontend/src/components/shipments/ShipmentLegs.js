import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from '../../utils/axiosConfig';
import { toast } from 'react-toastify';

const ShipmentLegs = ({ shipmentId, readOnly = false }) => {
  const [legs, setLegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLeg, setEditingLeg] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    legOrder: '',
    origin: '',
    destination: '',
    flightNumber: '',
    mawbNumber: '',
    departureTime: '',
    arrivalTime: '',
    status: 'Pending',
    notes: ''
  });

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
      const res = await axios.get(`/api/shipment-legs/${shipmentId}`);
      setLegs(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching shipment legs:', err);
      toast.error('Failed to load shipment legs');
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
    setFormData({
      legOrder: '',
      origin: '',
      destination: '',
      flightNumber: '',
      mawbNumber: '',
      departureTime: '',
      arrivalTime: '',
      status: 'Pending',
      notes: ''
    });
    setEditingLeg(null);
  };

  // Open form to add a new leg
  const handleAddLeg = () => {
    resetForm();
    // Set default legOrder to next available number
    const nextLegOrder = legs.length > 0 
      ? Math.max(...legs.map(leg => leg.legOrder)) + 1 
      : 1;
    
    setFormData(prev => ({ ...prev, legOrder: nextLegOrder }));
    setShowForm(true);
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
    if (window.confirm('Are you sure you want to delete this leg?')) {
      try {
        await axios.delete(`/api/shipment-legs/${shipmentId}/${legId}`);
        setLegs(legs.filter(leg => leg._id !== legId));
        toast.success('Leg deleted successfully');
      } catch (err) {
        console.error('Error deleting leg:', err);
        toast.error('Failed to delete leg');
      }
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
    <div className="shipment-legs-container">
      <h3>Shipment Legs</h3>
      
      {!readOnly && (
        <button 
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleAddLeg}
          disabled={showForm || !shipmentId}
        >
          <i className="fas fa-plus"></i> Add Leg
        </button>
      )}
      
      {showForm && !readOnly && (
        <div className="leg-form-container">
          <h4>{editingLeg ? 'Edit Leg' : 'Add New Leg'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="legOrder">Leg Order</label>
                <input
                  type="number"
                  className="form-control"
                  id="legOrder"
                  name="legOrder"
                  value={formData.legOrder}
                  onChange={onChange}
                  min="1"
                  max="4"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="origin">Origin</label>
                <input
                  type="text"
                  className="form-control"
                  id="origin"
                  name="origin"
                  value={formData.origin}
                  onChange={onChange}
                  placeholder="e.g. CMB"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="destination">Destination</label>
                <input
                  type="text"
                  className="form-control"
                  id="destination"
                  name="destination"
                  value={formData.destination}
                  onChange={onChange}
                  placeholder="e.g. DXB"
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="flightNumber">Flight Number</label>
                <input
                  type="text"
                  className="form-control"
                  id="flightNumber"
                  name="flightNumber"
                  value={formData.flightNumber}
                  onChange={onChange}
                  placeholder="e.g. EK517"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="mawbNumber">MAWB Number</label>
                <input
                  type="text"
                  className="form-control"
                  id="mawbNumber"
                  name="mawbNumber"
                  value={formData.mawbNumber}
                  onChange={onChange}
                  placeholder="e.g. 176-12345678"
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="departureTime">Departure Time</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  id="departureTime"
                  name="departureTime"
                  value={formData.departureTime}
                  onChange={onChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="arrivalTime">Arrival Time</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  id="arrivalTime"
                  name="arrivalTime"
                  value={formData.arrivalTime}
                  onChange={onChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  className="form-control"
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={onChange}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Arrived">Arrived</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Canceled">Canceled</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  className="form-control"
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={onChange}
                  rows="2"
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingLeg ? 'Update Leg' : 'Add Leg'}
              </button>
              <button 
                type="button" 
                className="btn btn-light" 
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      
      {legs.length > 0 ? (
        <div className="legs-table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Leg</th>
                <th>Route</th>
                <th>Flight</th>
                <th>MAWB</th>
                <th>Departure</th>
                <th>Arrival</th>
                <th>Status</th>
                {!readOnly && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {legs.sort((a, b) => a.legOrder - b.legOrder).map(leg => (
                <tr key={leg._id}>
                  <td>{leg.legOrder}</td>
                  <td>{leg.origin} → {leg.destination}</td>
                  <td>{leg.flightNumber}</td>
                  <td>{leg.mawbNumber}</td>
                  <td>{new Date(leg.departureTime).toLocaleString()}</td>
                  <td>{new Date(leg.arrivalTime).toLocaleString()}</td>
                  <td>
                    <span className={`status-badge status-${leg.status.toLowerCase().replace(' ', '-')}`}>
                      {leg.status}
                    </span>
                  </td>
                  {!readOnly && (
                    <td>
                      <button
                        onClick={() => handleEditLeg(leg)}
                        className="btn btn-primary btn-sm"
                        title="Edit Leg"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
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
      ) : (
        <p>No legs added yet. {!readOnly && 'Click "Add Leg" to add your first shipment leg.'}</p>
      )}
    </div>
  );
};

ShipmentLegs.propTypes = {
  shipmentId: PropTypes.string,
  readOnly: PropTypes.bool
};

export default ShipmentLegs; 