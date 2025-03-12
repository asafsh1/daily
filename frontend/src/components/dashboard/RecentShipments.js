import React from 'react';
import { Link } from 'react-router-dom';
import Moment from 'react-moment';
import PropTypes from 'prop-types';

const RecentShipments = ({ shipments }) => {
  return (
    <div className="recent-shipments">
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Customer</th>
            <th>AWB</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {shipments.map(shipment => (
            <tr key={shipment._id}>
              <td>
                <Moment format="DD/MM/YYYY">{shipment.dateAdded}</Moment>
              </td>
              <td>{shipment.customer}</td>
              <td>{shipment.awbNumber1}</td>
              <td>
                <span
                  className={`status-badge status-${shipment.shipmentStatus.toLowerCase()}`}
                >
                  {shipment.shipmentStatus}
                </span>
              </td>
              <td>
                <Link
                  to={`/shipments/${shipment._id}`}
                  className="btn btn-sm"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

RecentShipments.propTypes = {
  shipments: PropTypes.array.isRequired
};

export default RecentShipments; 