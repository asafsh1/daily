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
  const [debugInfo, setDebugInfo] = useState(null);

  // UseEffect to fetch legs on component mount or when shipmentId changes
  useEffect(() => {
    console.log('ShipmentLegs component mounted or shipmentId changed:', shipmentId);
    if (shipmentId) {
      fetchLegs();
    }
    
    // Set up an interval to refresh legs data every 60 seconds
    const refreshInterval = setInterval(() => {
      if (shipmentId && !shipmentId.toString().startsWith('temp-')) {
        console.log('Auto-refreshing legs data...');
        fetchLegs();
      }
    }, 60000);
    
    // Clean up interval on component unmount
    return () => clearInterval(refreshInterval);
  }, [shipmentId]); // Only re-run when shipmentId changes

  // Debug function to view shipment details
  const inspectShipment = async () => {
    try {
      console.log('Inspecting full shipment data for legs debugging...');
      const res = await axios.get(`/api/shipments/${shipmentId}`);
      console.log('Full shipment data:', res.data);
      setDebugInfo({
        shipmentId: shipmentId,
        hasLegsArray: !!(res.data && res.data.legs),
        legsArrayLength: res.data && res.data.legs ? res.data.legs.length : 0,
        legsArrayType: res.data && res.data.legs ? typeof res.data.legs : 'undefined',
        firstLeg: res.data && res.data.legs && res.data.legs.length > 0 ? res.data.legs[0] : null
      });
    } catch (err) {
      console.error('Error inspecting shipment:', err);
      setDebugInfo({
        error: err.message
      });
    }
  };

  // Fetch legs for this shipment
  const fetchLegs = async () => {
    try {
      setLoading(true);
      console.log(`Getting legs for shipment: ${shipmentId}`);
      
      // Skip API calls for temporary shipments
      if (!shipmentId || shipmentId.toString().startsWith('temp-')) {
        console.log('Using local state for temporary shipment ID');
        setLoading(false);
        return;
      }
      
      // DIRECT METHOD: Get the legs directly from the legs endpoint
      try {
        console.log(`Fetching legs directly from legs endpoint for shipment ${shipmentId}`);
        const directResponse = await axios.get(`/api/shipment-legs/${shipmentId}`);
        
        if (Array.isArray(directResponse.data) && directResponse.data.length > 0) {
          console.log(`Successfully fetched ${directResponse.data.length} legs from direct endpoint`);
          processFetchedLegs(directResponse.data);
          return;
        } else {
          console.log(`Direct legs endpoint returned no legs, trying shipment endpoint...`);
        }
      } catch (directError) {
        console.error(`Error fetching from direct legs endpoint:`, directError);
      }
      
      // FALLBACK METHOD: Get legs through shipment endpoint
      try {
        console.log(`Fetching full shipment data for ID: ${shipmentId}`);
        const shipmentResponse = await axios.get(`/api/shipments/${shipmentId}`);
        console.log(`Full shipment data received:`, shipmentResponse.data);
        
        if (shipmentResponse.data?.legs && Array.isArray(shipmentResponse.data.legs) && shipmentResponse.data.legs.length > 0) {
          console.log(`Found ${shipmentResponse.data.legs.length} legs in shipment response`);
          processFetchedLegs(shipmentResponse.data.legs);
          return;
        } else {
          console.log(`No legs found in shipment response either`);
          setLegs([]);
          setError("No legs found for this shipment");
          inspectShipment();
        }
      } catch (shipmentError) {
        console.error(`Error fetching from shipment endpoint:`, shipmentError);
        setError(`Failed to load shipment legs: ${shipmentError.message}`);
        setLegs([]);
      }
    } catch (err) {
      console.error(`General error fetching legs:`, err);
      setError(`Failed to load shipment legs: ${err.message}`);
      setLegs([]);
    } finally {
      setLoading(false);
    }
  };

  // Extract the processing of fetched legs to a separate function
  const processFetchedLegs = (legsData) => {
    if (!Array.isArray(legsData)) {
      console.error(`processFetchedLegs received non-array:`, legsData);
      setLegs([]);
      setError("Invalid leg data format");
      return;
    }
    
    // Log raw legs before processing
    console.log(`Processing ${legsData.length} raw legs:`, legsData);
    
    // Normalize legs for consistency
    const normalizedLegs = normalizeLegs(legsData);
    
    // Sort legs by order
    const sortedLegs = [...normalizedLegs].sort((a, b) => 
      (Number(a.legOrder) || 0) - (Number(b.legOrder) || 0)
    );
    
    console.log(`Finished processing ${sortedLegs.length} legs:`, sortedLegs);
    setLegs(sortedLegs);
    setError(null);
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
    if (!Array.isArray(legs)) {
      console.error('normalizeLegs received non-array:', legs);
      return [];
    }
    
    return legs.map(leg => {
      // Handle potential null legs
      if (!leg) return null;
      
      const normalizedLeg = {
        _id: leg._id || leg.id || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        legOrder: leg.legOrder || leg.order || 0,
        from: leg.from || leg.origin || '',
        to: leg.to || leg.destination || '',
        origin: leg.origin || leg.from || '',
        destination: leg.destination || leg.to || '',
        carrier: leg.carrier || leg.airline || leg.shippingLine || '',
        departureDate: leg.departureDate || leg.departureTime || null,
        arrivalDate: leg.arrivalDate || leg.arrivalTime || null,
        trackingNumber: leg.trackingNumber || leg.awbNumber || leg.trackingId || '',
        status: leg.status || 'pending',
        notes: leg.notes || '',
        
        // Preserve any other properties
        ...leg
      };
      
      console.log(`Normalized leg ${normalizedLeg.legOrder}: ${normalizedLeg.from} to ${normalizedLeg.to}`);
      return normalizedLeg;
    }).filter(Boolean); // Remove any null legs
  };

  // Add a function to directly check leg status in the database
  const checkLegsInDatabase = async () => {
    try {
      console.log('Running direct database check for legs...');
      const response = await axios.get(`/api/debug/shipment-legs/${shipmentId}`);
      console.log('Direct database check result:', response.data);
      
      setDebugInfo({
        shipmentId: shipmentId,
        databaseCheck: response.data,
        timestamp: new Date().toISOString()
      });
      
      // Now directly try to use the legs found in the database
      if (response.data.independentLegs.count > 0) {
        console.log(`Found ${response.data.independentLegs.count} independent legs - using them`);
        processFetchedLegs(response.data.independentLegs.legs);
        setError(null);
        return true;
      } else if (response.data.referencedLegs.count > 0) {
        console.log(`Found ${response.data.referencedLegs.count} referenced legs - using them`);
        processFetchedLegs(response.data.referencedLegs.legs);
        setError(null);
        return true;
      } else {
        console.log('No legs found in either location');
        return false;
      }
    } catch (err) {
      console.error('Error in direct database check:', err);
      setDebugInfo({
        error: `Database check failed: ${err.message}`,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Add a repairLegs function to fix shipment legs
  const repairLegs = async () => {
    try {
      console.log(`Running repair function for shipment legs: ${shipmentId}`);
      setLoading(true);
      
      // Call the special repair endpoint
      const response = await axios.get(`/api/shipments/repair-legs/${shipmentId}`);
      console.log('Repair response:', response.data);
      
      if (response.data.success) {
        // Set success message
        setSuccess(`Repair successful: ${response.data.message}`);
        
        // Update debug info
        setDebugInfo({
          repairResult: response.data,
          timestamp: new Date().toISOString()
        });
        
        // If legs were found, refresh and display them
        if (response.data.legs.after > 0) {
          // Wait a moment for database to update
          setTimeout(() => {
            fetchLegs();
          }, 1000);
        }
      } else {
        setError(`Repair failed: ${response.data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error repairing legs:', err);
      setError(`Repair failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Render function for debug info
  const renderDebugInfo = () => {
    if (!debugInfo && !error) return null;
    
    return (
      <div className="debug-info" style={{ margin: '20px 0', padding: '10px', border: '1px solid #ddd', background: '#f8f8f8' }}>
        <h4>Debug Information</h4>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button 
            onClick={() => repairLegs()} 
            className="btn btn-danger"
          >
            Repair Shipment Legs
          </button>
          
          <button 
            onClick={() => checkLegsInDatabase()} 
            className="btn btn-warning"
          >
            Check Legs in Database
          </button>
          
          <button 
            onClick={() => fetchLegs()} 
            className="btn btn-primary"
          >
            Retry Fetch
          </button>
        </div>
        
        {/* Repair results */}
        {debugInfo?.repairResult && (
          <div>
            <h5>Repair Results:</h5>
            <p><strong>Status:</strong> {debugInfo.repairResult.success ? 'Success' : 'Failed'}</p>
            <p><strong>Message:</strong> {debugInfo.repairResult.message}</p>
            <p><strong>Legs Before:</strong> {debugInfo.repairResult.legs.before}</p>
            <p><strong>Legs After:</strong> {debugInfo.repairResult.legs.after}</p>
            
            {debugInfo.repairResult.legs.list && debugInfo.repairResult.legs.list.length > 0 && (
              <div>
                <p><strong>Repaired Legs:</strong></p>
                <pre>{JSON.stringify(debugInfo.repairResult.legs.list, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
        
        {/* Database check results */}
        {debugInfo?.databaseCheck && (
          <div>
            <h5>Database Check Results:</h5>
            <p>Referenced legs: {debugInfo.databaseCheck.referencedLegs.count}</p>
            <p>Independent legs: {debugInfo.databaseCheck.independentLegs.count}</p>
            
            {debugInfo.databaseCheck.referencedLegs.count > 0 && (
              <div>
                <p><strong>Referenced Legs:</strong></p>
                <pre>{JSON.stringify(debugInfo.databaseCheck.referencedLegs.legs, null, 2)}</pre>
              </div>
            )}
            
            {debugInfo.databaseCheck.independentLegs.count > 0 && (
              <div>
                <p><strong>Independent Legs:</strong></p>
                <pre>{JSON.stringify(debugInfo.databaseCheck.independentLegs.legs, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
        
        {/* Original debug info */}
        {debugInfo && !debugInfo.databaseCheck && !debugInfo.repairResult && (
          <>
            <p>Shipment ID: {debugInfo.shipmentId}</p>
            <p>Has legs array: {debugInfo.hasLegsArray ? 'Yes' : 'No'}</p>
            <p>Legs array length: {debugInfo.legsArrayLength}</p>
            <p>Legs array type: {debugInfo.legsArrayType}</p>
            {debugInfo.firstLeg && (
              <div>
                <p>First leg sample:</p>
                <pre>{JSON.stringify(debugInfo.firstLeg, null, 2)}</pre>
              </div>
            )}
          </>
        )}
        
        {debugInfo?.error && (
          <p>Error: {debugInfo.error}</p>
        )}
        
        {debugInfo?.timestamp && (
          <p>Last checked: {new Date(debugInfo.timestamp).toLocaleTimeString()}</p>
        )}
      </div>
    );
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
          .debug-info {
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            padding: 10px;
            margin-bottom: 15px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
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

      {/* Debug information - remove in production */}
      <div className="debug-info">
        <p>Shipment ID: {shipmentId || 'none'}</p>
        <p>Legs found: {legs.length}</p>
        <p>Loading state: {loading ? 'true' : 'false'}</p>
        <p>Error state: {error ? error : 'none'}</p>
        <p>Show form: {showForm ? 'true' : 'false'}</p>
        <p>Edit mode: {editingLeg ? `true (leg ${editingLeg._id})` : 'false'}</p>
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
                onClick={handleSubmit}
                className="btn btn-primary"
              >
                {editingLeg ? 'Update Leg' : 'Add Leg'}
              </button>
            </div>
          </form>
        </div>
      )}

      {renderDebugInfo()}
    </div>
  );
};

ShipmentLegs.propTypes = {
  shipmentId: PropTypes.string,
  readOnly: PropTypes.bool
};

export default ShipmentLegs; 