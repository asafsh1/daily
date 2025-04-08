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
  flightNumber: '',
  vessel: ''
};

const ShipmentLegs = ({ shipmentId, readOnly = false }) => {
  const [legs, setLegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLeg, setEditingLeg] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [airlines, setAirlines] = useState([]);
  const [formData, setFormData] = useState(initialState);

  // Fetch legs and airlines on component mount and when shipmentId changes
  useEffect(() => {
    if (shipmentId) {
      fetchLegs();
      fetchAirlines();
    }
  }, [shipmentId]);

  // Fetch airlines from the API
  const fetchAirlines = async () => {
    try {
      const response = await axios.get('/api/airlines');
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        setAirlines(response.data);
        console.log('Loaded airlines from API:', response.data);
      } else {
        // API returned empty array or invalid data, use hardcoded airlines
        setAirlinesFromHardcodedData();
      }
    } catch (err) {
      console.error('Error fetching airlines:', err);
      // Use hardcoded airlines as fallback
      setAirlinesFromHardcodedData();
    }
  };

  // Set hardcoded airlines as fallback
  const setAirlinesFromHardcodedData = () => {
    const hardcodedAirlines = [
      { _id: '1', name: 'Emirates' },
      { _id: '2', name: 'Qatar Airways' },
      { _id: '3', name: 'Turkish Airlines' },
      { _id: '4', name: 'Lufthansa' },
      { _id: '5', name: 'Air France' },
      { _id: '6', name: 'KLM' },
      { _id: '7', name: 'British Airways' },
      { _id: '8', name: 'United Airlines' },
      { _id: '9', name: 'Delta Air Lines' },
      { _id: '10', name: 'American Airlines' }
    ];
    setAirlines(hardcodedAirlines);
    console.log('Using hardcoded airlines:', hardcodedAirlines);
  };

  // Fetch legs for the shipment
  const fetchLegs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First try to fetch legs directly
      const response = await axios.get(`/api/shipment-legs/shipment/${shipmentId}`);
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log('Legs fetched successfully:', response.data);
        setLegs(response.data);
        setLoading(false);
        return;
      }
      
      // If no legs found, try to create a default leg
      try {
        const shipmentResponse = await axios.get(`/api/shipments/${shipmentId}`);
        
        if (shipmentResponse.data && 
            shipmentResponse.data.origin && 
            shipmentResponse.data.destination) {
          
          // Create a basic leg from the shipment data
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
            synthetic: true
          };
          
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
      setError('Failed to load shipment legs');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Start editing a leg
  const startEditing = (leg) => {
    setEditingLeg(leg._id);
    setFormData({
      from: leg.from || leg.origin || '',
      to: leg.to || leg.destination || '',
      carrier: leg.carrier || '',
      legOrder: leg.legOrder || 0,
      departureDate: leg.departureDate ? moment(leg.departureDate).format('YYYY-MM-DD') : '',
      departureTime: leg.departureTime || '',
      arrivalDate: leg.arrivalDate ? moment(leg.arrivalDate).format('YYYY-MM-DD') : '',
      arrivalTime: leg.arrivalTime || '',
      trackingNumber: leg.trackingNumber || leg.mawbNumber || '',
      status: leg.status || 'Pending',
      notes: leg.notes || '',
      flightNumber: leg.flightNumber || leg.flight || '',
      vessel: leg.vessel || ''
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingLeg(null);
    setFormData(initialState);
  };

  // Save leg changes
  const saveLeg = async (legId) => {
    try {
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

      let result;
      if (legId.startsWith('synthetic-')) {
        // For synthetic legs, just update the local state
        setLegs(legs.map(leg => 
          leg._id === legId ? { ...leg, ...combinedData } : leg
        ));
        toast.success('Leg updated successfully');
      } else {
        // For real legs, update on the server
        result = await axios.put(`/api/shipment-legs/${legId}`, combinedData);
        toast.success('Leg updated successfully');
      }

      setEditingLeg(null);
      setFormData(initialState);
      fetchLegs(); // Refresh the legs list
    } catch (err) {
      console.error('Error saving leg:', err);
      toast.error(`Failed to save leg: ${err.message}`);
    }
  };

  // Add new leg
  const addNewLeg = () => {
    const newLeg = {
      _id: `new-${Date.now()}`,
      legOrder: legs.length + 1,
      status: 'Pending'
    };
    setLegs([...legs, newLeg]);
    setEditingLeg(newLeg._id);
    setFormData({
      ...initialState,
      legOrder: newLeg.legOrder
    });
  };

  // Handle leg deletion
  const handleDeleteLeg = async (legId, e) => {
    if (e) e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this leg?')) {
      return;
    }
    
    try {
      if (!legId.startsWith('synthetic-') && !legId.startsWith('new-')) {
        await axios.delete(`/api/shipment-legs/${legId}`);
      }
      setLegs(legs.filter(leg => leg._id !== legId));
      toast.success('Leg deleted successfully');
    } catch (err) {
      console.error('Error deleting leg:', err);
      toast.error('Failed to delete leg');
    }
  };

  // Handle leg status change
  const handleLegStatusChange = async (legId, newStatus, e) => {
    if (e) e.stopPropagation();
    
    try {
      if (!legId) {
        console.error('Cannot update status: No leg ID provided');
        return;
      }
      
      if (legId.startsWith('synthetic-') || legId.startsWith('new-')) {
        setLegs(legs.map(leg => 
          leg._id === legId ? { ...leg, status: newStatus } : leg
        ));
        return;
      }
      
      await axios.put(`/api/shipment-legs/${legId}/status`, { status: newStatus });
      setLegs(legs.map(leg => 
        leg._id === legId ? { ...leg, status: newStatus } : leg
      ));
      toast.success('Leg status updated');
    } catch (err) {
      console.error('Error updating leg status:', err);
      setError('Failed to update leg status');
    }
  };

  // Format date for display
  const formatDate = (date, time) => {
    if (!date) return 'N/A';
    const formattedDate = moment(date).format('DD/MM/YYYY');
    return time ? `${formattedDate} ${time}` : formattedDate;
  };

  // Generate a tracking URL for the leg
  const getTrackingUrl = (leg) => {
    return leg.trackingNumber ? getTrackingUrlSync(leg.carrier, leg.trackingNumber) : null;
  };

  // Format AWB/tracking number for display
  const getDisplayAwb = (leg) => {
    const awb = leg.trackingNumber || leg.awbNumber || leg.mawbNumber;
    if (!awb) return 'N/A';
    
    const hasTrackingUrl = getTrackingUrl(leg);
    
    if (hasTrackingUrl) {
      return (
        <a href={hasTrackingUrl} target="_blank" rel="noopener noreferrer">
          {awb} <i className="fas fa-external-link-alt"></i>
        </a>
      );
    }
    
    return awb;
  };

  // Display error message
  if (error) {
    return (
      <div className="alert alert-danger mt-3">
        {error}
        <button 
          className="btn btn-sm btn-outline-danger ml-2" 
          onClick={(e) => { e.stopPropagation(); setError(null); fetchLegs(); }}
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

  return (
    <div className="shipment-legs mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Shipment Legs ({legs.length})</h3>
        {!readOnly && (
          <button 
            className="btn btn-primary"
            onClick={addNewLeg}
          >
            <i className="fas fa-plus"></i> Add Leg
          </button>
        )}
      </div>

      {legs.length === 0 ? (
        <div className="alert alert-info">
          No legs found for this shipment. 
          {!readOnly && ' Click "Add Leg" to create the first leg.'}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Leg #</th>
                <th>Origin</th>
                <th>Destination</th>
                <th>Airline</th>
                <th>Flight</th>
                <th>AWB/Tracking</th>
                <th>Departure</th>
                <th>Arrival</th>
                <th>Status</th>
                {!readOnly && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {legs.map((leg) => (
                <tr key={leg._id} className={leg.synthetic ? 'table-warning' : ''}>
                  {editingLeg === leg._id ? (
                    <>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          name="legOrder"
                          value={formData.legOrder}
                          onChange={handleInputChange}
                          min="1"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          name="from"
                          value={formData.from}
                          onChange={handleInputChange}
                          placeholder="Origin"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          name="to"
                          value={formData.to}
                          onChange={handleInputChange}
                          placeholder="Destination"
                        />
                      </td>
                      <td>
                        <select
                          className="form-control form-control-sm"
                          name="carrier"
                          value={formData.carrier}
                          onChange={handleInputChange}
                        >
                          <option value="">-- Select Carrier --</option>
                          {airlines.map(airline => (
                            <option key={airline._id} value={airline.name}>
                              {airline.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          name="flightNumber"
                          value={formData.flightNumber}
                          onChange={handleInputChange}
                          placeholder="Flight number"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          name="trackingNumber"
                          value={formData.trackingNumber}
                          onChange={handleInputChange}
                          placeholder="AWB/Tracking number"
                        />
                      </td>
                      <td>
                        <div className="d-flex">
                          <input
                            type="date"
                            className="form-control form-control-sm mr-1"
                            name="departureDate"
                            value={formData.departureDate}
                            onChange={handleInputChange}
                          />
                          <input
                            type="time"
                            className="form-control form-control-sm"
                            name="departureTime"
                            value={formData.departureTime}
                            onChange={handleInputChange}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="d-flex">
                          <input
                            type="date"
                            className="form-control form-control-sm mr-1"
                            name="arrivalDate"
                            value={formData.arrivalDate}
                            onChange={handleInputChange}
                          />
                          <input
                            type="time"
                            className="form-control form-control-sm"
                            name="arrivalTime"
                            value={formData.arrivalTime}
                            onChange={handleInputChange}
                          />
                        </div>
                      </td>
                      <td>
                        <select
                          className="form-control form-control-sm"
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
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
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-success mr-1"
                          onClick={() => saveLeg(leg._id)}
                        >
                          <i className="fas fa-save"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={cancelEditing}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{leg.legOrder || 'N/A'}</td>
                      <td>{leg.from || leg.origin || 'N/A'}</td>
                      <td>{leg.to || leg.destination || 'N/A'}</td>
                      <td>{leg.carrier || 'N/A'}</td>
                      <td>{leg.flightNumber || 'N/A'}</td>
                      <td>{getDisplayAwb(leg)}</td>
                      <td>{formatDate(leg.departureDate, leg.departureTime)}</td>
                      <td>{formatDate(leg.arrivalDate, leg.arrivalTime)}</td>
                      <td>
                        {!readOnly ? (
                          <select
                            className={`form-control form-control-sm status-${leg.status?.toLowerCase().replace(/\s+/g, '-')}`}
                            value={leg.status || 'Pending'}
                            onChange={(e) => handleLegStatusChange(leg._id, e.target.value, e)}
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
                        ) : (
                          <span className={`status-badge status-${leg.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                            {leg.status || 'Pending'}
                          </span>
                        )}
                      </td>
                      {!readOnly && (
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary mr-1"
                            onClick={() => startEditing(leg)}
                            title="Edit leg"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={(e) => handleDeleteLeg(leg._id, e)}
                            title="Delete leg"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

ShipmentLegs.propTypes = {
  shipmentId: PropTypes.string.isRequired,
  readOnly: PropTypes.bool
};

export default ShipmentLegs; 