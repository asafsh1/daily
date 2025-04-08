import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from '../../utils/axiosConfig';
import { toast } from 'react-toastify';
import Moment from 'react-moment';
import { getTrackingUrlSync, hasTracking } from '../../utils/trackingUtils';
import moment from 'moment';
import { generateUniqueId, ID_PREFIXES } from '../../utils/idGenerator';
import LegModal from './LegModal';
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
  flightNumber: ''
};

const ShipmentLegs = ({ shipmentId, readOnly = false }) => {
  const [legs, setLegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLeg, setEditingLeg] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [selectedLegId, setSelectedLegId] = useState(null);
  const [airlines, setAirlines] = useState([]);

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
  
  // Helper to set hardcoded airlines
  const setAirlinesFromHardcodedData = () => {
    console.log('Using hardcoded airlines data');
    const hardcodedAirlines = [
      { _id: '1', name: 'El Al', code: '114' },
      { _id: '2', name: 'Emirates', code: '176' },
      { _id: '3', name: 'Qatar Airways', code: '157' },
      { _id: '4', name: 'Delta', code: '006' },
      { _id: '5', name: 'American Airlines', code: '001' }
    ];
    setAirlines(hardcodedAirlines);
  };
  
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
      legId: leg.legId || '',
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
      flightNumber: leg.flight || leg.flightNumber || '',
      statusHistory: leg.statusHistory || []
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
    setLoading(true);
    setError('');
    
    try {
      console.log(`Fetching legs for shipment ID: ${shipmentId}`);
      
      // Try the main API route first - should work based on backend implementation
      try {
        const response = await axios.get(`/api/shipment-legs/shipment/${shipmentId}`);
        console.log('API response from shipment-legs/shipment/', response.data);
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          setLegs(response.data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log("Main API route failed:", err.message);
      }
      
      // Try the second method - shipments/:id/legs approach
      try {
        const response = await axios.get(`/api/shipments/${shipmentId}/legs`);
        console.log('API response from shipments/:id/legs', response.data);
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          setLegs(response.data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log("Secondary API route failed:", err.message);
      }
      
      // Try the fallback route
      try {
        const response = await axios.get(`/api/shipment-legs/${shipmentId}`);
        console.log('API response from fallback route', response.data);
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          setLegs(response.data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log("Fallback API route failed:", err.message);
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
      setError('Failed to load shipment legs');
    } finally {
      setLoading(false);
    }
  };

  // Handle saving a leg from the modal
  const handleLegSave = (legData) => {
    fetchLegs(); // Refresh all legs after save
    setSuccess(editingLeg ? 'Leg updated successfully' : 'Leg added successfully');
    
    // Clear success message after a delay
    setTimeout(() => setSuccess(''), 3000);
  };

  // Function to handle edit button click
  const editLeg = (leg, e) => {
    if (e) e.stopPropagation(); // Prevent event bubbling
    console.log('Editing leg:', leg);
    setEditingLeg(normalizeLeg(leg));
    setShowModal(true);
  };

  // Function to handle add new leg button click
  const addNewLeg = (e) => {
    if (e) e.stopPropagation(); // Prevent event bubbling
    setEditingLeg(null);
    setShowModal(true);
  };

  // Close the modal
  const closeModal = (e) => {
    if (e) e.stopPropagation(); // Prevent event bubbling
    setShowModal(false);
  };

  // Generate a tracking URL for the leg
  const getTrackingUrl = (leg) => {
    return leg.trackingNumber ? getTrackingUrlSync(leg.carrier, leg.trackingNumber) : null;
  };

  // Format AWB/tracking number for display
  const getDisplayAwb = (leg) => {
    const awb = leg.trackingNumber || leg.awbNumber || leg.mawbNumber;
    if (!awb) return 'N/A';
    
    // Check if this carrier has tracking
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

  // Handle leg deletion
  const handleDeleteLeg = async (legId, e) => {
    if (e) e.stopPropagation(); // Prevent event bubbling
    
    if (!window.confirm('Are you sure you want to delete this leg?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/shipment-legs/${legId}`);
      toast.success('Leg deleted successfully');
      
      // Update local state
        setLegs(legs.filter(leg => leg._id !== legId));
    } catch (err) {
      console.error('Error deleting leg:', err);
      toast.error('Failed to delete leg');
    }
  };

  // Handle leg status change
  const handleLegStatusChange = async (legId, newStatus, e) => {
    if (e) e.stopPropagation(); // Prevent event bubbling
    
    try {
      if (!legId) {
        console.error('Cannot update status: No leg ID provided');
        return;
      }
      
      // For synthetic legs, we can just update the local state
      if (legId.startsWith('synthetic-')) {
        setLegs(legs.map(leg => 
          leg._id === legId ? { ...leg, status: newStatus } : leg
        ));
        
        return;
      }
      
      // For real legs, update on the server
      const res = await axios.put(`/api/shipment-legs/${legId}/status`, { status: newStatus });
        
        // Update local state
        setLegs(legs.map(leg => 
          leg._id === legId ? { ...leg, status: newStatus } : leg
        ));
        
        toast.success('Leg status updated');
    } catch (err) {
      console.error('Error updating leg status:', err);
      setError('Failed to update leg status');
    }
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
  
  // Render success message if present
  const successMessage = success ? (
    <div className="alert alert-success mt-2">{success}</div>
  ) : null;
  
  // Render legs table
  return (
    <div className="shipment-legs mt-3">
      {successMessage}
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
          {!readOnly && 'Click "Add Leg" to create the first leg.'}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Leg #</th>
                <th>Leg ID</th>
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
                <tr 
                  key={leg._id} 
                  className={leg.synthetic ? 'table-warning' : ''}
                  onClick={(e) => editLeg(leg, e)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{leg.legOrder || 'N/A'}</td>
                  <td>{leg.legId || 'N/A'}</td>
                  <td>{leg.from || leg.origin || 'N/A'}</td>
                  <td>{leg.to || leg.destination || 'N/A'}</td>
                  <td>{leg.carrier || 'N/A'}</td>
                  <td>{leg.flightNumber || 'N/A'}</td>
                  <td onClick={(e) => e.stopPropagation()}>{getDisplayAwb(leg)}</td>
                  <td>{formatDate(leg.departureDate, leg.departureTime)}</td>
                  <td>{formatDate(leg.arrivalDate, leg.arrivalTime)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
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
                    <td onClick={(e) => e.stopPropagation()}>
                        <button
                        className="btn btn-sm btn-outline-primary mr-1" 
                        onClick={(e) => editLeg(leg, e)}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leg edit/add modal */}
      <LegModal 
        isOpen={showModal}
        onClose={closeModal}
        shipmentId={shipmentId}
        editingLeg={editingLeg}
        onSave={handleLegSave}
        airlines={airlines}
      />
    </div>
  );
};

ShipmentLegs.propTypes = {
  shipmentId: PropTypes.string.isRequired,
  readOnly: PropTypes.bool
};

export default ShipmentLegs; 