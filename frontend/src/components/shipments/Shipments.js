import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Moment from 'react-moment';
import { getShipments, updateShipment, deleteShipment } from '../../actions/shipment';
import Spinner from '../layout/Spinner';
import { convertToCSV, downloadCSV } from '../../utils/exportUtils';
import { toast } from 'react-toastify';
import { getTrackingUrl, hasTracking } from '../../utils/trackingUtils';

const Shipments = ({ getShipments, updateShipment, deleteShipment, shipment: { shipments, loading } }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [shipmentToDelete, setShipmentToDelete] = useState(null);

  useEffect(() => {
    console.log('Calling getShipments()...');
    getShipments()
      .then(() => console.log('getShipments completed successfully'))
      .catch(err => console.error('Error in getShipments:', err));
  }, [getShipments]);

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
    
    // DEBUG: Log leg data to see what fields are available
    console.log('Leg data for shipment', shipment.serialNumber, ':', shipment.legs.map(leg => {
      if (!leg) return 'null leg';
      return {
        legOrder: leg.legOrder,
        awbNumber: leg.awbNumber,
        mawbNumber: leg.mawbNumber,
        awb: leg.awb
      };
    }));
    
    // Process all legs and their AWBs
    shipment.legs.forEach(leg => {
      if (!leg) return;
      
      // Check for all possible AWB fields in the leg
      const awbFields = ['awbNumber', 'awb', 'awbNumber1', 'awbNumber2'];
      let foundAwb = false;
      
      awbFields.forEach(field => {
        const awbValue = leg[field];
        if (awbValue && typeof awbValue === 'string' && awbValue.trim() !== '') {
          foundAwb = true;
          // If this AWB is already in the map, add this leg number to the list
          if (awbMap.has(awbValue)) {
            const existingData = awbMap.get(awbValue);
            existingData.legNumbers.push(leg.legOrder || 'unknown');
          } else {
            // Otherwise create a new entry
            awbMap.set(awbValue, {
              awb: awbValue,
              legNumbers: [leg.legOrder || 'unknown']
            });
          }
        }
      });
      
      // If no AWB was found but there's a MAWB, use the MAWB as the AWB
      if (!foundAwb && leg.mawbNumber && typeof leg.mawbNumber === 'string' && leg.mawbNumber.trim() !== '') {
        if (awbMap.has(leg.mawbNumber)) {
          const existingData = awbMap.get(leg.mawbNumber);
          existingData.legNumbers.push(leg.legOrder || 'unknown');
        } else {
          awbMap.set(leg.mawbNumber, {
            awb: leg.mawbNumber,
            legNumbers: [leg.legOrder || 'unknown'],
            isMawb: true
          });
        }
      }
    });
    
    // Also check for direct AWB properties on the shipment itself
    if (shipment.awbNumber1 && !awbMap.has(shipment.awbNumber1)) {
      awbMap.set(shipment.awbNumber1, {awb: shipment.awbNumber1, legNumbers: []});
    }
    if (shipment.awbNumber2 && !awbMap.has(shipment.awbNumber2)) {
      awbMap.set(shipment.awbNumber2, {awb: shipment.awbNumber2, legNumbers: []});
    }
    
    // Convert the map to an array with formatted AWB strings
    return Array.from(awbMap.values());
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

  return loading ? (
    <Spinner />
  ) : (
    <section className="container">
      <h1 className="large text-primary">Shipments</h1>
      <p className="lead">
        <i className="fas fa-shipping-fast"></i> View and manage shipments
      </p>
      
      <div className="shipment-controls">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search by customer or AWB..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Transit">In Transit</option>
            <option value="Arrived">Arrived</option>
            <option value="Delayed">Delayed</option>
            <option value="Canceled">Canceled</option>
          </select>
        </div>
        <div className="action-buttons">
          <button 
            onClick={handleExportCSV} 
            className="btn btn-success"
            title="Export to CSV"
          >
            <i className="fas fa-file-csv"></i> Export CSV
          </button>
          <Link to="/add-shipment" className="btn btn-primary">
            Add Shipment
          </Link>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Serial #</th>
              <th>Date Added</th>
              <th>Customer</th>
              <th>AWBs</th>
              <th>Routing</th>
              <th>Order Status</th>
              <th>Shipment Status</th>
              <th>Departure</th>
              <th>Arrival</th>
              <th>Invoiced</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map(shipment => (
                <tr key={shipment._id}>
                  <td>{shipment.serialNumber || '-'}</td>
                  <td>
                    <Moment format="DD/MM/YYYY">{shipment.dateAdded}</Moment>
                  </td>
                  <td>
                    {typeof shipment.customer === 'object' 
                      ? (shipment.customer?.name || 'Unknown') 
                      : (typeof shipment.customer === 'string' && shipment.customer.length > 24 
                        ? 'Unknown' // If it's an ObjectId string
                        : shipment.customer || 'Unknown')}
                  </td>
                  <td>
                    {shipment.legs && shipment.legs.length > 0 ? (
                      <div className="awb-list">
                        {getUniqueAWBs(shipment).length > 0 ? (
                          getUniqueAWBs(shipment).map((data, index) => (
                            <div key={index} className="leg-awb" style={{marginBottom: '3px'}}>
                              {data.isMawb ? (
                                <span><small>MAWB:</small> {' '}
                                  {hasTracking(data.awb) ? (
                                    <a 
                                      href={getTrackingUrl(data.awb)} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="awb-tracking-link"
                                      title="Track shipment"
                                    >
                                      {data.awb} <i className="fas fa-external-link-alt fa-xs"></i>
                                    </a>
                                  ) : (
                                    data.awb
                                  )}
                                </span>
                              ) : (
                                <span>
                                  {hasTracking(data.awb) ? (
                                    <a 
                                      href={getTrackingUrl(data.awb)} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="awb-tracking-link"
                                      title="Track shipment"
                                    >
                                      {data.awb} <i className="fas fa-external-link-alt fa-xs"></i>
                                    </a>
                                  ) : (
                                    data.awb
                                  )}
                                  {data.legNumbers.length > 1 
                                    ? ` (Leg ${data.legNumbers.join('/')})`
                                    : data.legNumbers.length === 1
                                      ? ` (Leg ${data.legNumbers[0]})`
                                      : ''}
                                </span>
                              )}
                            </div>
                          ))
                        ) : (
                          <div>No AWBs found</div>
                        )}
                      </div>
                    ) : (
                      shipment.awbNumber1 ? (
                        hasTracking(shipment.awbNumber1) ? (
                          <a 
                            href={getTrackingUrl(shipment.awbNumber1)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="awb-tracking-link"
                            title="Track shipment"
                          >
                            {shipment.awbNumber1} <i className="fas fa-external-link-alt fa-xs"></i>
                          </a>
                        ) : (
                          shipment.awbNumber1
                        )
                      ) : 'No AWBs'
                    )}
                  </td>
                  <td>
                    {shipment.legs && shipment.legs.length > 0 ? (
                      // Calculate routing from legs
                      <div className="routing">
                        {shipment.legs.map((leg, index) => (
                          <span key={index}>
                            {index === 0 ? leg.origin : ""}
                            {index >= 0 ? "-" + leg.destination : ""}
                          </span>
                        ))}
                      </div>
                    ) : (
                      shipment.routing || '-'
                    )}
                  </td>
                  <td>
                    <span 
                      className={`status-badge order-status-${shipment.orderStatus ? shipment.orderStatus.replace(/\s+/g, '-').toLowerCase() : 'unknown'}`}
                    >
                      {shipment.orderStatus || 'Unknown'}
                    </span>
                  </td>
                  <td>
                    <span 
                      className={`status-badge status-${normalizeShipmentStatus(shipment.shipmentStatus).toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {normalizeShipmentStatus(shipment.shipmentStatus)}
                      {shipment.legs && shipment.legs.length > 1 && (
                        <span className="leg-info">
                          (Leg {getActiveLegIndex(shipment) + 1}/{shipment.legs.length})
                        </span>
                      )}
                    </span>
                    {shipment.legs && shipment.legs.length > 0 && (
                      <div className="active-leg-route">
                        {(() => {
                          // Use the active leg index from our helper function
                          const activeLegIndex = getActiveLegIndex(shipment);
                          
                          // If active leg found, show its route
                          if (activeLegIndex >= 0 && activeLegIndex < shipment.legs.length) {
                            const activeLeg = shipment.legs[activeLegIndex];
                            return (
                              <small>
                                {activeLeg.origin} → {activeLeg.destination}
                              </small>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </td>
                  <td>
                    {shipment.legs && shipment.legs.length > 0 ? (
                      <Moment format="DD/MM/YYYY HH:mm">
                        {shipment.legs[0].departureTime}
                      </Moment>
                    ) : shipment.scheduledDeparture ? (
                      <Moment format="DD/MM/YYYY HH:mm">
                        {shipment.scheduledDeparture}
                      </Moment>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>
                    {shipment.legs && shipment.legs.length > 0 ? (
                      <Moment format="DD/MM/YYYY HH:mm">
                        {shipment.legs[shipment.legs.length - 1].arrivalTime}
                      </Moment>
                    ) : shipment.scheduledArrival ? (
                      <Moment format="DD/MM/YYYY HH:mm">
                        {shipment.scheduledArrival}
                      </Moment>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>
                    {shipment.invoiced ? (
                      <div className="invoiced-info">
                        <span className="text-success">Yes</span>
                        {shipment.invoiceNumber && (
                          <div className="invoice-number">
                            <small>#{shipment.invoiceNumber}</small>
                          </div>
                        )}
                      </div>
                    ) : (
                      'No'
                    )}
                  </td>
                  <td>
                    <Link
                      to={`/shipments/${shipment._id}`}
                      className="btn btn-sm"
                    >
                      View
                    </Link>
                    <Link
                      to={`/edit-shipment/${shipment._id}`}
                      className="btn btn-sm"
                    >
                      Edit
                    </Link>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteClick(shipment)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11">No shipments found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
    </section>
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
