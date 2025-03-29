import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Moment from 'react-moment';
import { getShipments, updateShipment } from '../../actions/shipment';
import Spinner from '../layout/Spinner';
import { convertToCSV, downloadCSV } from '../../utils/exportUtils';

const Shipments = ({ getShipments, updateShipment, shipment: { shipments, loading } }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filteredData, setFilteredData] = useState([]);

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
                          leg.awbNumber && <div key={index}>{leg.awbNumber}</div>
                        ))}
                      </div>
                    ) : (
                      shipment.awbNumber1 || 'No AWBs'
                    )}
                  </td>
                  <td>{shipment.routing || '-'}</td>
                  <td>
                    <span 
                      className={`status-badge order-status-${shipment.orderStatus ? shipment.orderStatus.replace(/\s+/g, '-').toLowerCase() : 'unknown'}`}
                    >
                      {shipment.orderStatus || 'Unknown'}
                    </span>
                  </td>
                  <td>
                    <span 
                      className={`status-badge status-${shipment.shipmentStatus.split(' ')[0].toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {shipment.shipmentStatus}
                    </span>
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
                  <td>{shipment.invoiced ? 'Yes' : 'No'}</td>
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
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10">No shipments found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

Shipments.propTypes = {
  getShipments: PropTypes.func.isRequired,
  updateShipment: PropTypes.func.isRequired,
  shipment: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  shipment: state.shipment
});

export default connect(mapStateToProps, { getShipments, updateShipment })(Shipments); 