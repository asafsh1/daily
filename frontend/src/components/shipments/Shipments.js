import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Moment from 'react-moment';
import { getShipments, updateShipment, deleteShipment } from '../../actions/shipment';
import Spinner from '../layout/Spinner';
import { convertToCSV, downloadCSV } from '../../utils/exportUtils';
import { toast } from 'react-toastify';

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
                        {shipment.legs.map((leg, index) => (
                          leg.awbNumber && (
                            <div key={index} className="leg-awb">
                              <small className="text-muted">Leg {leg.legOrder}:</small> {leg.awbNumber}
                            </div>
                          )
                        ))}
                        {shipment.legs.map((leg, index) => (
                          leg.mawbNumber && (
                            <div key={`mawb-${index}`} className="leg-mawb">
                              <small className="text-muted">MAWB:</small> {leg.mawbNumber}
                            </div>
                          )
                        ))}
                      </div>
                    ) : (
                      shipment.awbNumber1 || 'No AWBs'
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
                      className={`status-badge status-${shipment.shipmentStatus.toLowerCase().split(' ')[0]}`}
                    >
                      {shipment.shipmentStatus}
                      {shipment.legs && shipment.legs.length > 1 && (
                        <span className="leg-info">
                          (Leg {shipment.legs.findIndex(leg => 
                            leg.status === 'active' || 
                            leg.status === 'in progress' || 
                            leg.legOrder === Math.max(...shipment.legs.map(l => l.completed ? 0 : l.legOrder))
                          ) + 1}/{shipment.legs.length})
                        </span>
                      )}
                    </span>
                    {shipment.legs && shipment.legs.length > 0 && (
                      <div className="active-leg-route">
                        {(() => {
                          // Find the active leg index
                          const activeLegIndex = shipment.legs.findIndex(leg => 
                            leg.status === 'active' || 
                            leg.status === 'in progress' || 
                            leg.legOrder === Math.max(...shipment.legs.map(l => l.completed ? 0 : l.legOrder))
                          );
                          
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