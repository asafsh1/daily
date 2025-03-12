import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Moment from 'react-moment';
import { getShipments, updateShipment } from '../../actions/shipment';
import Spinner from '../layout/Spinner';

const Shipments = ({ getShipments, updateShipment, shipment: { shipments, loading } }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    getShipments();
  }, [getShipments]);

  const handleStatusChange = async (shipmentId, newStatus) => {
    await updateShipment(shipmentId, { shipmentStatus: newStatus });
  };

  const filteredShipments = shipments.filter(
    shipment => {
      // Safely handle potentially null values
      const customerLower = (shipment.customer || '').toLowerCase();
      const awbLower = (shipment.awbNumber1 || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      return (searchTerm === '' || 
              customerLower.includes(searchLower) || 
              awbLower.includes(searchLower)) &&
             (filterStatus === '' || shipment.shipmentStatus === filterStatus);
    }
  );

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
            <option value="Arrived">Arrived</option>
            <option value="Delayed">Delayed</option>
            <option value="Canceled">Canceled</option>
          </select>
        </div>
        <Link to="/add-shipment" className="btn btn-primary">
          Add Shipment
        </Link>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Date Added</th>
              <th>Customer</th>
              <th>AWB</th>
              <th>Routing</th>
              <th>Status</th>
              <th>Scheduled Arrival</th>
              <th>Invoiced</th>
              <th>Created By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.length > 0 ? (
              filteredShipments.map(shipment => (
                <tr key={shipment._id}>
                  <td>
                    <Moment format="DD/MM/YYYY">{shipment.dateAdded}</Moment>
                  </td>
                  <td>{shipment.customer}</td>
                  <td>{shipment.awbNumber1}</td>
                  <td>{shipment.routing}</td>
                  <td>
                    <select
                      className={`status-select status-${shipment.shipmentStatus.toLowerCase()}`}
                      value={shipment.shipmentStatus}
                      onChange={(e) => handleStatusChange(shipment._id, e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Arrived">Arrived</option>
                      <option value="Delayed">Delayed</option>
                      <option value="Canceled">Canceled</option>
                    </select>
                  </td>
                  <td>
                    <Moment format="DD/MM/YYYY">
                      {shipment.scheduledArrival}
                    </Moment>
                  </td>
                  <td>{shipment.invoiced ? 'Yes' : 'No'}</td>
                  <td>{shipment.createdBy || 'Not specified'}</td>
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
                <td colSpan="9">No shipments found</td>
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