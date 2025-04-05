import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Moment from 'react-moment';
import { getShipments, updateShipment, deleteShipment } from '../../actions/shipment';
import Spinner from '../layout/Spinner';
import { convertToCSV, downloadCSV } from '../../utils/exportUtils';
import { toast } from 'react-toastify';
import { getTrackingUrlSync, hasTracking } from '../../utils/trackingUtils';
import { Button, Table, Container, Row, Col, Card, Alert } from 'react-bootstrap';
import './Shipments.css';
import ShipmentItem from './ShipmentItem';

const Shipments = ({ getShipments, updateShipment, deleteShipment, shipment: { shipments, loading, error } }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [shipmentToDelete, setShipmentToDelete] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsRetrying(true);
        await getShipments();
        setFetchError(null);
      } catch (err) {
        console.error('Failed to fetch shipments:', err);
        setFetchError(err.message || 'Failed to load shipments. Please try again later.');
      } finally {
        setIsRetrying(false);
      }
    };

    fetchData();
  }, [getShipments, retryCount]);

  // Filter shipments when data changes
  useEffect(() => {
    console.log('Shipments data changed, current state:', { 
      shipments: shipments || 'null/undefined', 
      loading, 
      shipmentLength: shipments ? shipments.length : 0 
    });
    
    if (!shipments) return;
    
    try {
      const filtered = shipments.filter(shipment => {
        // Skip null/undefined shipments
        if (!shipment) return false;
        
        try {
          // Get customer name safely - handle both string and object customer references
          const customerName = typeof shipment.customer === 'object' 
            ? (shipment.customer?.name || '') 
            : (shipment.customer || '');
          
          // Get AWB numbers from legs or from direct properties
          let awbNumbers = '';
          if (shipment.legs && shipment.legs.length > 0) {
            awbNumbers = shipment.legs.map(leg => leg.awbNumber || '').join(' ');
          } else if (shipment.awbNumber1) {
            awbNumbers = shipment.awbNumber1;
            if (shipment.awbNumber2) awbNumbers += ' ' + shipment.awbNumber2;
          }
          
          // Search in customer name and AWB numbers
          const searchLower = searchTerm.toLowerCase();
          const customerMatches = customerName.toLowerCase().includes(searchLower);
          const awbMatches = awbNumbers.toLowerCase().includes(searchLower);
          
          // Match status by prefix instead of exact match to handle detailed statuses like "In Transit (Leg 1)"
          const statusMatches = filterStatus === '' || 
                                shipment.shipmentStatus === filterStatus || 
                                (filterStatus && shipment.shipmentStatus?.startsWith(filterStatus));
          
          return (searchTerm === '' || customerMatches || awbMatches) && statusMatches;
        } catch (err) {
          console.error('Error filtering shipment:', err, shipment);
          return false;
        }
      });
      
      setFilteredData(filtered);
      console.log('Filtered shipments:', filtered.length, 'out of', shipments.length);
    } catch (err) {
      console.error('Error in filtering effect:', err);
    }
  }, [shipments, searchTerm, filterStatus, loading]);

  const handleStatusChange = async (shipmentId, newStatus) => {
    await updateShipment(shipmentId, { shipmentStatus: newStatus });
  };

  // Delete modal handlers
  const handleDeleteClick = (shipment) => {
    setShipmentToDelete(shipment);
    setDeletePassword('');
    setShowDeleteModal(true);
  };

  const handleCloseModal = () => {
    setShowDeleteModal(false);
    setShipmentToDelete(null);
    setDeletePassword('');
  };

  const handlePasswordChange = (e) => {
    setDeletePassword(e.target.value);
  };

  const handleDeleteConfirm = async () => {
    if (deletePassword === 'Admin1212') {
      try {
        console.log('Deleting shipment with ID:', shipmentToDelete._id);
        const success = await deleteShipment(shipmentToDelete._id);
        
        if (success) {
          toast.success('Shipment deleted successfully');
          // Force refresh the shipments list to ensure UI is updated
          await getShipments();
          
          // Remove the deleted shipment from the filtered data as well
          setFilteredData(prevData => 
            prevData.filter(item => item._id !== shipmentToDelete._id)
          );
          
          console.log('Shipment removed from list. Current filtered data length:', 
            filteredData.filter(item => item._id !== shipmentToDelete._id).length);
        } else {
          toast.error('Error deleting shipment - server returned failure');
        }
        
        handleCloseModal();
      } catch (err) {
        toast.error('Error deleting shipment');
        console.error('Error deleting shipment:', err);
      }
    } else {
      toast.error('Incorrect password');
    }
  };

  // Handle export to CSV
  const handleExportCSV = () => {
    // Define the CSV headers (mapping from data keys to display names)
    const headers = [
      { key: 'dateAdded', display: 'Date Added', isDate: true },
      { key: 'customer.name', display: 'Customer' },
      { key: 'legs[0].awbNumber', display: 'Primary AWB' },
      { key: 'routing', display: 'Routing' },
      { key: 'orderStatus', display: 'Order Status' },
      { key: 'shipmentStatus', display: 'Shipment Status' },
      { key: 'legs[0].departureTime', display: 'Departure', isDate: true },
      { key: 'legs[legs.length-1].arrivalTime', display: 'Arrival', isDate: true },
      { key: 'invoiced', display: 'Invoiced' },
      { key: 'invoiceSent', display: 'Invoice Sent' },
      { key: 'cost', display: 'Cost' },
      { key: 'receivables', display: 'Receivables' },
      { key: 'createdBy', display: 'Created By' },
      { key: 'comments', display: 'Comments' }
    ];

    // Process the data to handle nested properties
    const processedData = filteredData.map(shipment => {
      const processed = {...shipment};
      processed['customer.name'] = shipment.customer?.name || 'Unknown';
      processed['legs[0].awbNumber'] = shipment.legs && shipment.legs.length > 0 ? shipment.legs[0].awbNumber : '';
      processed['legs[0].departureTime'] = shipment.legs && shipment.legs.length > 0 ? shipment.legs[0].departureTime : '';
      processed['legs[legs.length-1].arrivalTime'] = shipment.legs && shipment.legs.length > 0 ? shipment.legs[shipment.legs.length - 1].arrivalTime : '';
      return processed;
    });

    // Convert filtered shipments to CSV format
    const csvContent = convertToCSV(processedData, headers);
    
    // Generate file name with current date
    const date = new Date().toISOString().split('T')[0];
    const fileName = `shipments-export-${date}.csv`;
    
    // Download the CSV file
    downloadCSV(csvContent, fileName);
  };

  // Helper function to normalize leg fields for display, handling both old and new field formats
  const normalizeShipmentLeg = (leg) => {
    if (!leg) return null;
    
    return {
      ...leg,
      // Map from/to fields from different possible sources
      from: leg.from || leg.origin || '',
      to: leg.to || leg.destination || '',
      // Map carrier/airline fields
      carrier: leg.carrier || leg.flightNumber || leg.airline || '',
      // Map date fields
      departureDate: leg.departureDate || leg.departureTime || null,
      arrivalDate: leg.arrivalDate || leg.arrivalTime || null,
      // Map tracking fields
      trackingNumber: leg.trackingNumber || leg.awbNumber || leg.mawbNumber || ''
    };
  };

  // Helper function to get unique AWBs from shipment legs
  const getUniqueAWBs = (shipment) => {
    if (!shipment.legs || !Array.isArray(shipment.legs) || shipment.legs.length === 0) {
      // For shipments without legs, return any direct AWB numbers
      const awbs = [];
      if (shipment.awbNumber1) awbs.push({awb: shipment.awbNumber1, legNumbers: []});
      if (shipment.awbNumber2) awbs.push({awb: shipment.awbNumber2, legNumbers: []});
      return awbs;
    }
    
    // Create a map to store AWBs with their corresponding leg numbers
    const awbMap = new Map();
    
    // Process all legs and their AWBs, handling both old and new field formats
    shipment.legs.forEach((leg, index) => {
      if (!leg) return;
      
      // Normalize the leg to handle different field formats
      const normalizedLeg = normalizeShipmentLeg(leg);
      
      // Get leg index/number for display (1-based indexing for display)
      const legNumber = normalizedLeg.legOrder || (index + 1);
      
      // Get AWB from any available field
      const awb = normalizedLeg.trackingNumber || '';
      
      if (awb && awb.trim() !== '') {
        // If AWB exists in map, add this leg number
        if (awbMap.has(awb)) {
          awbMap.get(awb).legNumbers.push(legNumber);
        } else {
          // Otherwise create a new entry
          awbMap.set(awb, { awb, legNumbers: [legNumber] });
        }
      }
    });
    
    // Convert map to array and sort by leg number (first leg first)
    return Array.from(awbMap.values()).sort((a, b) => {
      // Sort by the smallest leg number in each AWB's legNumbers array
      const aMin = Math.min(...a.legNumbers);
      const bMin = Math.min(...b.legNumbers);
      return aMin - bMin;
    });
  };
  
  // Helper function to normalize shipment status
  const normalizeShipmentStatus = (status) => {
    if (!status) return 'Unknown';
    
    // Remove any leg information from the status
    const baseStatusMap = {
      'pending': 'Pending',
      'in transit': 'In Transit',
      'arrived': 'Arrived',
      'delayed': 'Delayed',
      'canceled': 'Canceled'
    };
    
    // Find which base status this starts with
    const statusLower = status.toLowerCase();
    for (const [key, value] of Object.entries(baseStatusMap)) {
      if (statusLower.startsWith(key)) {
        return value;
      }
    }
    
    return status;
  };

  // Add this helper function near the other helper functions
  const getActiveLegIndex = (shipment) => {
    if (!shipment.legs || !Array.isArray(shipment.legs) || shipment.legs.length === 0) {
      return -1;
    }
    
    // First, look for any leg with "In Transit" status (regardless of case)
    const inTransitIndex = shipment.legs.findIndex(leg => 
      leg.status && leg.status.toLowerCase() === 'in transit'
    );
    
    // If we found an "In Transit" leg, return that
    if (inTransitIndex >= 0) {
      return inTransitIndex;
    }
    
    // If no leg is in transit, find the highest leg that is not "Pending"
    // Start from the highest leg order and go down
    for (let i = shipment.legs.length - 1; i >= 0; i--) {
      const leg = shipment.legs[i];
      if (leg.status && leg.status.toLowerCase() !== 'pending') {
        return i;
      }
    }
    
    // If all legs are pending or no legs have status, return the first leg
    return 0;
  };

  // Helper function to get the routing string from shipment
  const getShipmentRouting = (shipment) => {
    console.log('Getting routing for shipment:', shipment?._id);
    
    // If the shipment already has a routing field, use it
    if (shipment.routing && typeof shipment.routing === 'string') {
      console.log('Using existing routing field:', shipment.routing);
      return shipment.routing;
    }
    
    // If no legs, return N/A
    if (!shipment.legs || !Array.isArray(shipment.legs) || shipment.legs.length === 0) {
      console.log('No legs found for routing');
      return 'N/A';
    }
    
    try {
      // Sort legs by legOrder or order if available
      const sortedLegs = [...shipment.legs].sort((a, b) => {
        // Handle possible field names for leg order
        const orderA = a.legOrder !== undefined ? a.legOrder : 
                       (a.order !== undefined ? a.order : 0);
        const orderB = b.legOrder !== undefined ? b.legOrder : 
                       (b.order !== undefined ? b.order : 0);
        return orderA - orderB;
      });

      // Create an array of airport codes in the correct order
      const route = [];
      
      sortedLegs.forEach((leg, index) => {
        // Handle possible field names for origin
        const origin = leg.from || leg.origin || '';
        // Handle possible field names for destination
        const destination = leg.to || leg.destination || '';
        
        if (index === 0 && origin) {
          route.push(origin);
        }
        if (destination) {
          route.push(destination);
        }
      });
      
      // Join the route with hyphens
      const routingString = route.join('-');
      console.log('Generated routing string:', routingString);
      return routingString || 'N/A';
    } catch (err) {
      console.error('Error generating routing string:', err);
      return 'Error';
    }
  };

  // Get AWB/tracking numbers from a shipment
  const getShipmentAWB = (shipment) => {
    console.log('Getting AWB for shipment:', shipment?._id);
    
    // First check for direct AWB fields on the shipment
    if (shipment.awbNumber) {
      console.log('Found direct AWB field:', shipment.awbNumber);
      return shipment.awbNumber;
    }
    
    if (shipment.trackingNumber) {
      console.log('Found direct tracking number field:', shipment.trackingNumber);
      return shipment.trackingNumber;
    }
    
    if (shipment.mawbNumber) {
      console.log('Found direct MAWB field:', shipment.mawbNumber);
      return shipment.mawbNumber;
    }
    
    // Split AWBs are sometimes in separate fields
    if (shipment.awbNumber1) {
      const awbs = [shipment.awbNumber1];
      if (shipment.awbNumber2) awbs.push(shipment.awbNumber2);
      console.log('Found split AWB fields:', awbs.join(', '));
      return awbs.join(', ');
    }
    
    // Check for AWBs in legs
    if (shipment.legs && Array.isArray(shipment.legs) && shipment.legs.length > 0) {
      const awbs = [];
      
      // Collect tracking numbers from all legs
      shipment.legs.forEach(leg => {
        if (!leg) return;
        
        // Try all possible field names
        const trackingNumber = leg.trackingNumber || leg.awbNumber || leg.mawbNumber;
        
        if (trackingNumber && !awbs.includes(trackingNumber)) {
          awbs.push(trackingNumber);
        }
      });
      
      if (awbs.length > 0) {
        console.log('Found AWBs in legs:', awbs.join(', '));
        return awbs.join(', ');
      }
    }
    
    console.log('No AWB found for shipment');
    return 'N/A';
  };

  // Helper function to normalize shipment data for display
  const normalizeShipmentForDisplay = (shipment) => {
    if (!shipment) return null;
    
    // Create a normalized copy
    const normalized = {...shipment};
    
    // Ensure legs is always an array
    if (!normalized.legs || !Array.isArray(normalized.legs)) {
      normalized.legs = [];
    }
    
    // Extract customer name from either string or object
    normalized.customerName = 
      (typeof normalized.customer === 'object') ? 
        (normalized.customer?.name || 'Unknown') : 
        (normalized.customer || 'Unknown');
    
    // Get AWB/tracking numbers
    normalized.awbs = getShipmentAWB(normalized);
    
    // Get routing information
    normalized.routingString = getShipmentRouting(normalized);
    
    return normalized;
  };

  // Render the table row for a shipment
  const renderShipmentRow = (shipment) => {
    const normalizedShipment = normalizeShipmentForDisplay(shipment);
    
    return (
      <tr key={normalizedShipment._id} className={normalizedShipment.invoiced ? 'row-success' : ''}>
        <td>
          <Link to={`/shipments/${normalizedShipment._id}`}>
            {normalizedShipment.serialId || normalizedShipment._id.substring(0, 8)}
          </Link>
        </td>
        <td>
          {normalizedShipment.dateAdded ? (
            <Moment format="DD/MM/YYYY">{normalizedShipment.dateAdded}</Moment>
          ) : (
            'N/A'
          )}
        </td>
        <td>{normalizedShipment.customerName}</td>
        <td>{normalizedShipment.awbs}</td>
        <td>{normalizedShipment.routingString}</td>
        <td>{normalizedShipment.orderStatus || 'Not Set'}</td>
        <td className={`status-${normalizedShipment.shipmentStatus?.replace(/\s+/g, '-')?.toLowerCase() || 'undefined'}`}>
          {normalizedShipment.shipmentStatus || 'Not Set'}
        </td>
        <td>
          {normalizedShipment.legs && normalizedShipment.legs.length > 0 && 
           (normalizedShipment.legs[0].departureDate || normalizedShipment.legs[0].departureTime) ? (
            <Moment format="DD/MM/YYYY">
              {normalizedShipment.legs[0].departureDate || normalizedShipment.legs[0].departureTime}
            </Moment>
          ) : (
            'N/A'
          )}
        </td>
        <td>
          {normalizedShipment.legs && 
           normalizedShipment.legs.length > 0 && 
           (normalizedShipment.legs[normalizedShipment.legs.length - 1].arrivalDate || 
            normalizedShipment.legs[normalizedShipment.legs.length - 1].arrivalTime) ? (
            <Moment format="DD/MM/YYYY">
              {normalizedShipment.legs[normalizedShipment.legs.length - 1].arrivalDate || 
               normalizedShipment.legs[normalizedShipment.legs.length - 1].arrivalTime}
            </Moment>
          ) : (
            'N/A'
          )}
        </td>
        <td>{normalizedShipment.invoiced ? 'Yes' : 'No'}</td>
        <td>
          <div className="action-buttons">
            <Link to={`/shipments/${normalizedShipment._id}`} className="btn btn-info btn-sm">
              View
            </Link>
            <Link to={`/edit-shipment/${normalizedShipment._id}`} className="btn btn-primary btn-sm">
              Edit
            </Link>
            <button 
              onClick={() => handleDeleteClick(normalizedShipment)} 
              className="btn btn-danger btn-sm"
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // Determine what to display based on loading and error states
  const renderContent = () => {
    // Show spinner when initially loading
    if (loading && !fetchError && shipments.length === 0) {
      return (
        <div className="d-flex justify-content-center my-5">
          <Spinner />
        </div>
      );
    }

    // Show error message if there's an error
    if ((fetchError || error) && shipments.length === 0) {
      return (
        <Alert variant="danger" className="my-3">
          <Alert.Heading>Error Loading Shipments</Alert.Heading>
          <p>{fetchError || error || 'There was a problem loading the shipments data.'}</p>
          <div className="d-flex justify-content-end">
            <Button 
              variant="outline-danger" 
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          </div>
        </Alert>
      );
    }

    // Show empty state if no shipments and no error
    if (shipments.length === 0) {
      return (
        <Card className="text-center my-3 border-light">
          <Card.Body className="py-5">
            <Card.Title>No Shipments Found</Card.Title>
            <Card.Text>
              There are no shipments to display at the moment.
            </Card.Text>
            <Button as={Link} to="/create-shipment" variant="primary">
              Create Your First Shipment
            </Button>
          </Card.Body>
        </Card>
      );
    }

    // Show shipments table with data
    return (
      <div className="table-responsive">
        <Table hover className="shipments-table">
          <thead>
            <tr>
              <th className="column-sm">No.</th>
              <th className="column-lg">Shipper</th>
              <th className="column-md">Origin</th>
              <th className="column-md">Destination</th>
              <th className="column-md">Status</th>
              <th className="column-lg">Mode</th>
              <th className="column-md">Date</th>
              <th className="column-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((shipment, index) => (
              <ShipmentItem key={shipment._id} shipment={shipment} index={index} />
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  const handleRetry = () => {
    setRetryCount(prevCount => prevCount + 1);
  };

  return (
    <Container fluid className="px-4">
      <Row className="my-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="mb-0">Shipments</h1>
            <div>
              <Button as={Link} to="/create-shipment" variant="primary">
                Create New Shipment
              </Button>
            </div>
          </div>
          
          {/* Show a small refreshing indicator when retrying but there's already data */}
          {isRetrying && shipments.length > 0 && (
            <Alert variant="info" className="py-2 mb-3">
              <small>Refreshing shipments data...</small>
            </Alert>
          )}
          
          {renderContent()}
        </Col>
      </Row>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="btn-close" onClick={handleCloseModal}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this shipment?</p>
              {shipmentToDelete && (
                <div className="delete-info">
                  <p><strong>Serial:</strong> {shipmentToDelete.serialNumber || 'N/A'}</p>
                  <p><strong>Customer:</strong> {
                    typeof shipmentToDelete.customer === 'object' 
                      ? shipmentToDelete.customer?.name 
                      : shipmentToDelete.customer
                  }</p>
                </div>
              )}
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label htmlFor="deletePassword">Enter Admin Password:</label>
                <input
                  type="password"
                  id="deletePassword"
                  value={deletePassword}
                  onChange={handlePasswordChange}
                  className="form-control"
                  placeholder="Enter password"
                  style={{ marginTop: '10px' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>
                Delete
              </button>
              <button className="btn btn-light" onClick={handleCloseModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

Shipments.propTypes = {
  getShipments: PropTypes.func.isRequired,
  updateShipment: PropTypes.func.isRequired,
  deleteShipment: PropTypes.func.isRequired,
  shipment: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  shipment: state.shipment
});

export default connect(mapStateToProps, { getShipments, updateShipment, deleteShipment })(Shipments); 
