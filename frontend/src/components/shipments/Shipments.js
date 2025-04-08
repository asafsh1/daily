import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Moment from 'react-moment';
import { getShipments, updateShipment, deleteShipment } from '../../actions/shipment';
import Spinner from '../layout/Spinner';
import { toast } from 'react-toastify';
import { Button, Table, Container, Row, Col, Alert, Form, InputGroup } from 'react-bootstrap';
import './Shipments.css';

const Shipments = ({ getShipments, updateShipment, deleteShipment, shipment: { shipments, loading, error } }) => {
  const [fetchError, setFetchError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [shipmentToDelete, setShipmentToDelete] = useState(null);

  // Fetch shipments data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsRetrying(true);
        console.log('Fetching shipments data...');
        
        // No longer requiring authentication
        const result = await getShipments();
        console.log('Shipments fetched successfully, count:', result?.length || 0);
        setFetchError(null);
      } catch (err) {
        console.error('Failed to fetch shipments:', err);
        // Check for specific error types
        if (err.message && err.message.includes('Network Error')) {
          setFetchError('Network error. Please check your internet connection.');
        } else {
          setFetchError(err.message || 'Failed to load shipments');
        }
      } finally {
        setIsRetrying(false);
      }
    };

    fetchData();
  }, [getShipments, retryCount]);

  // Filter shipments based on search and filter criteria
  useEffect(() => {
    if (!Array.isArray(shipments)) {
      setFilteredData([]);
      return;
    }
    
    try {
      const filtered = shipments.filter(shipment => {
        if (!shipment) return false;
        
        // Get customer name safely, handling both string and object references
        const customerName = shipment.customer && typeof shipment.customer === 'object'
          ? (shipment.customer.name || '')
            : (shipment.customer || '');
          
        // Check if search term matches customer or AWB
          const searchLower = searchTerm.toLowerCase();
          const customerMatches = customerName.toLowerCase().includes(searchLower);
        
        // Get AWB numbers from either legs or direct properties
        let awbMatches = false;
        if (shipment.awbNumber) {
          awbMatches = shipment.awbNumber.toLowerCase().includes(searchLower);
        } else if (shipment.legs && Array.isArray(shipment.legs)) {
          const awbs = shipment.legs
            .map(leg => leg.awbNumber || leg.trackingNumber || '')
            .join(' ');
          awbMatches = awbs.toLowerCase().includes(searchLower);
        }

        // Check if status matches filter
        const statusMatches = !filterStatus || 
          shipment.status === filterStatus || 
          shipment.shipmentStatus === filterStatus;

        return (searchTerm === '' || customerMatches || awbMatches) && statusMatches;
      });
      
      setFilteredData(filtered);
    } catch (err) {
      console.error('Error filtering shipments:', err);
      // Fallback to showing all shipments if filtering fails
      setFilteredData(shipments);
    }
  }, [shipments, searchTerm, filterStatus]);

  // Handle retry button
  const handleRetry = () => {
    setRetryCount(prevCount => prevCount + 1);
  };

  // Handle status change
  const handleStatusChange = async (shipmentId, newStatus) => {
    try {
      await updateShipment(shipmentId, { status: newStatus });
      toast.success('Status updated successfully');
    } catch (err) {
      toast.error('Failed to update status');
    }
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
        const success = await deleteShipment(shipmentToDelete._id);
        
        if (success) {
          toast.success('Shipment deleted successfully');
          // Force refresh to update the list
          handleRetry();
        } else {
          toast.error('Failed to delete shipment');
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

  // Add a debugShipmentField function to log field extraction logic
  const debugShipmentField = (shipment, fieldName, extractedValue) => {
    // Skip debugging for non-problematic fields
    if (['_id', 'dateAdded', 'serialNumber', 'customer', 'customerName', 'shipmentStatus'].includes(fieldName)) {
      return;
    }
    
    // Log detailed information about the field extraction
    console.log(`Field extraction for ${fieldName}:`, {
      shipmentId: shipment._id,
      extractedValue,
      hasLegs: shipment.legs ? true : false,
      legsCount: shipment.legs ? shipment.legs.length : 0,
      directField: shipment[fieldName],
      firstLegField: shipment.legs && shipment.legs[0] ? shipment.legs[0][fieldName] : undefined
    });
  };

  // Error handling - only show error if we have no data
  if (loading || (isRetrying && (!shipments || shipments.length === 0))) {
    return (
      <Container>
        <h1 className="large text-primary">Shipments</h1>
        <div className="text-center my-5">
          <Spinner />
          <p>Loading shipments...</p>
        </div>
      </Container>
    );
  }

  // Display error only if we have no data
  if ((fetchError || error) && (!shipments || shipments.length === 0)) {
    return (
      <Container>
        <h1 className="large text-primary">Shipments</h1>
        <Alert variant="danger">
          <Alert.Heading>Error Loading Shipments</Alert.Heading>
          <p>{fetchError || (error && error.msg) || 'Unknown error'}</p>
          <Button onClick={handleRetry} variant="outline-danger">Retry</Button>
        </Alert>
      </Container>
    );
  }

  // Main render - data display
  return (
    <Container fluid className="px-4">
      <Row className="my-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
      <h1 className="large text-primary">Shipments</h1>
            <Button as={Link} to="/create-shipment" variant="primary">
              Create New Shipment
            </Button>
          </div>
          
          {/* Search and filter controls */}
          <div className="mb-4">
            <Row>
              <Col md={6}>
                <InputGroup>
                  <Form.Control
            type="text"
            placeholder="Search by customer or AWB..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
                </InputGroup>
              </Col>
              <Col md={4}>
                <Form.Select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Transit">In Transit</option>
            <option value="Arrived">Arrived</option>
            <option value="Delayed">Delayed</option>
                  <option value="Completed">Completed</option>
            <option value="Canceled">Canceled</option>
                </Form.Select>
              </Col>
              <Col md={2} className="text-end">
                <Button 
                  variant="outline-secondary"
                  onClick={handleRetry}
                  disabled={isRetrying}
                >
                  {isRetrying ? 'Refreshing...' : 'Refresh'}
                </Button>
              </Col>
            </Row>
      </div>

          {/* Show refresh indicator */}
          {isRetrying && (
            <Alert variant="info" className="py-2 mb-3">
              <small>Refreshing shipment data...</small>
            </Alert>
          )}
          
          {/* Table of shipments */}
          {filteredData.length > 0 ? (
      <div className="table-responsive">
              <Table hover bordered className="shipments-table">
          <thead>
            <tr>
                    <th>ID</th>
                    <th>Date</th>
              <th>Customer</th>
                    <th>Origin</th>
                    <th>Destination</th>
                    <th>Status</th>
              <th>Departure</th>
              <th>Arrival</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
                  {filteredData.map((shipment, index) => {
                    // Safe property access with fallbacks
                    const customerId = shipment._id ? shipment._id.toString() : `temp-${index}`;
                    const shortId = customerId.substring(0, 8);
                    
                    const customerName = shipment.customer ?
                      (typeof shipment.customer === 'object' ? 
                        (shipment.customer.name || 'Unknown') : shipment.customer)
                      : 'Unknown';
                      
                    // Get origin with better fallback logic
                    const origin = shipment.origin || 
                      (shipment.legs && Array.isArray(shipment.legs) && shipment.legs.length > 0 && 
                       (shipment.legs[0].from || shipment.legs[0].origin || 'N/A')) || 'N/A';
                    debugShipmentField(shipment, 'origin', origin);
                      
                    // Get destination with better fallback logic
                    const destination = shipment.destination || 
                      (shipment.legs && Array.isArray(shipment.legs) && shipment.legs.length > 0 && 
                       (shipment.legs[shipment.legs.length-1].to || 
                        shipment.legs[shipment.legs.length-1].destination || 'N/A')) || 'N/A';
                    debugShipmentField(shipment, 'destination', destination);
                    
                    const status = shipment.shipmentStatus || 'Pending';
                    
                    // Get departure date with better fallback logic
                    const departureDate = shipment.departureDate || 
                      (shipment.legs && Array.isArray(shipment.legs) && shipment.legs.length > 0 && 
                       (shipment.legs[0].departureDate || shipment.legs[0].departureTime)) || null;
                    debugShipmentField(shipment, 'departureDate', departureDate);
                        
                    // Get arrival date with better fallback logic
                    const arrivalDate = shipment.arrivalDate || 
                      (shipment.legs && Array.isArray(shipment.legs) && shipment.legs.length > 0 && 
                       (shipment.legs[shipment.legs.length-1].arrivalDate || 
                        shipment.legs[shipment.legs.length-1].arrivalTime)) || null;
                    debugShipmentField(shipment, 'arrivalDate', arrivalDate);
                    
                    // Status badge class
                    const getStatusClass = (status) => {
                      const statusLower = status.toLowerCase();
                      if (statusLower.includes('completed')) return 'bg-success';
                      if (statusLower.includes('transit')) return 'bg-primary';
                      if (statusLower.includes('pending')) return 'bg-warning';
                      if (statusLower.includes('canceled')) return 'bg-danger';
                      if (statusLower.includes('delayed')) return 'bg-warning text-dark';
                      return 'bg-secondary';
                    };
                    
                    return (
                      <tr key={customerId || index}>
                        <td>
                          <Link to={`/shipments/${customerId}`}>
                            {shipment.serialNumber || shortId}
                          </Link>
                  </td>
                  <td>
                          {shipment.dateAdded ? (
                            <Moment format="MM/DD/YYYY">{shipment.dateAdded}</Moment>
                          ) : 'N/A'}
                  </td>
                        <td>{customerName}</td>
                        <td>{origin}</td>
                        <td>{destination}</td>
                        <td>
                          <span className={`badge ${getStatusClass(status)}`}>
                            {status}
                          </span>
                  </td>
                  <td>
                          {departureDate ? (
                            <Moment format="MM/DD/YYYY">{departureDate}</Moment>
                          ) : 'N/A'}
                  </td>
                  <td>
                          {arrivalDate ? (
                            <Moment format="MM/DD/YYYY">{arrivalDate}</Moment>
                          ) : 'N/A'}
                  </td>
                  <td>
                          <div className="d-flex gap-1">
                            <Button 
                              as={Link} 
                              to={`/shipments/${customerId}`} 
                              variant="outline-info" 
                              size="sm"
                    >
                      View
                            </Button>
                            <Button 
                              as={Link} 
                              to={`/edit-shipment/${customerId}`} 
                              variant="outline-primary" 
                              size="sm"
                    >
                      Edit
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                      onClick={() => handleDeleteClick(shipment)}
                    >
                      Delete
                            </Button>
                          </div>
                  </td>
                </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          ) : (
            <Alert variant="info">
              No shipments found matching your search criteria.
            </Alert>
          )}
        </Col>
      </Row>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="btn-close" onClick={handleCloseModal}></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this shipment?</p>
              {shipmentToDelete && (
                <div className="delete-info">
                  <p><strong>ID:</strong> {shipmentToDelete._id?.substring(0, 8) || 'N/A'}</p>
                  <p><strong>Customer:</strong> {
                    typeof shipmentToDelete.customer === 'object' 
                      ? shipmentToDelete.customer?.name 
                      : shipmentToDelete.customer || 'Unknown'
                  }</p>
                </div>
              )}
              <Form.Group className="mt-3">
                <Form.Label>Enter Admin Password:</Form.Label>
                <Form.Control
                  type="password"
                  value={deletePassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter password"
                />
              </Form.Group>
            </div>
            <div className="modal-footer">
              <Button variant="danger" onClick={handleDeleteConfirm}>
                Delete
              </Button>
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
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
