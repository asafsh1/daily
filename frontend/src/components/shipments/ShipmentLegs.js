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

  // Fetch legs on component mount
  useEffect(() => {
    if (shipmentId) {
      fetchLegs();
    }
  }, [shipmentId]);
  
  // Add this helper function to ensure all leg fields are properly extracted
  const normalizeLeg = (leg) => {
    if (!leg) return null;
    
    return {
      _id: leg._id || leg.id || `temp-${Date.now()}`,
      legOrder: leg.legOrder || leg.order || 0,
      from: leg.from || leg.origin || '',
      to: leg.to || leg.destination || '',
      origin: leg.origin || leg.from || '',
      destination: leg.destination || leg.to || '',
      carrier: leg.carrier || leg.airline || leg.shippingLine || '',
      departureDate: leg.departureDate || leg.departureTime || null,
      arrivalDate: leg.arrivalDate || leg.arrivalTime || null,
      awbNumber: leg.awbNumber || leg.trackingNumber || leg.awb || '',
      status: leg.status || 'Not Started',
      notes: leg.notes || '',
      flight: leg.flight || leg.flightNumber || ''
    };
  };

  // Update the fetchLegs function to normalize all legs
  const fetchLegs = async () => {
    try {
      setLoading(true);
      
      if (!shipmentId) {
        setLegs([]);
        setLoading(false);
        return;
      }
      
      // Try the shipment endpoint first (this should have the most reliable data now)
      console.log(`Fetching shipment data for ID: ${shipmentId}`);
      const shipmentResponse = await axios.get(`/api/shipments/${shipmentId}`);
      
      if (shipmentResponse.data?.legs && Array.isArray(shipmentResponse.data.legs) && shipmentResponse.data.legs.length > 0) {
        console.log(`Found ${shipmentResponse.data.legs.length} legs in shipment response`);
        const normalizedLegs = shipmentResponse.data.legs.map(leg => normalizeLeg(leg)).filter(Boolean);
        setLegs(sortLegs(normalizedLegs));
        setLoading(false);
        return;
      }
      
      // If no legs in shipment data, try direct legs endpoint
      console.log(`Fetching legs directly for shipment ID: ${shipmentId}`);
      const legsResponse = await axios.get(`/api/shipment-legs/${shipmentId}`);
      
      if (Array.isArray(legsResponse.data) && legsResponse.data.length > 0) {
        console.log(`Found ${legsResponse.data.length} legs via direct endpoint`);
        const normalizedLegs = legsResponse.data.map(leg => normalizeLeg(leg)).filter(Boolean);
        setLegs(sortLegs(normalizedLegs));
      } else {
        console.log('No legs found');
        setLegs([]);
      }
    } catch (error) {
      console.error('Error fetching legs:', error);
      setLegs([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper to sort legs by order
  const sortLegs = (legs) => {
    return [...legs].sort((a, b) => (Number(a.legOrder) || 0) - (Number(b.legOrder) || 0));
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

  // Format status for display
  const getFormattedStatus = (status) => {
    return status || 'Not Started';
  };

  // Render loading state
  if (loading) {
    return <div className="text-center p-4">Loading shipment legs...</div>;
  }
  
  // Render no legs message
  if (!legs || legs.length === 0) {
    return (
      <div className="alert alert-info mt-3">
        No legs have been added to this shipment yet.
      </div>
    );
  }
  
  // Render legs table
  return (
    <div className="shipment-legs mt-3">
      <h3>Shipment Legs ({legs.length})</h3>
      
      <div className="table-responsive">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Leg #</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Carrier</th>
              <th>Flight</th>
              <th>AWB</th>
              <th>Departure Date</th>
              <th>Arrival Date</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {legs.map((leg, index) => (
              <tr key={leg._id || index}>
                <td>{(leg.legOrder || index + 1)}</td>
                <td>{leg.from || leg.origin || 'N/A'}</td>
                <td>{leg.to || leg.destination || 'N/A'}</td>
                <td>{leg.carrier || 'N/A'}</td>
                <td>{leg.flight || leg.flightNumber || 'N/A'}</td>
                <td>{leg.awbNumber || leg.trackingNumber || leg.awb || 'N/A'}</td>
                <td>
                  {leg.departureDate ? (
                    <Moment format="DD/MM/YYYY">{leg.departureDate}</Moment>
                  ) : 'N/A'}
                </td>
                <td>
                  {leg.arrivalDate ? (
                    <Moment format="DD/MM/YYYY">{leg.arrivalDate}</Moment>
                  ) : 'N/A'}
                </td>
                <td>
                  <span className={`status-badge status-${leg.status?.toLowerCase()?.replace(/\s+/g, '-') || 'unknown'}`}>
                    {leg.status || 'Not Started'}
                  </span>
                </td>
                <td>{leg.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

ShipmentLegs.propTypes = {
  shipmentId: PropTypes.string,
  readOnly: PropTypes.bool
};

export default ShipmentLegs; 