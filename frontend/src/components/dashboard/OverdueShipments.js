import React from 'react';
import { Link } from 'react-router-dom';
import Moment from 'react-moment';
import PropTypes from 'prop-types';

const OverdueShipments = ({ shipments }) => {
  return (
    <div className="overdue-shipments">
      <h3 className="text-danger mb-3">Overdue Non-Invoiced Shipments</h3>
      {shipments.length === 0 ? (
        <p>No overdue shipments found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Date Added</th>
                <th>Customer</th>
                <th>AWB</th>
                <th>Scheduled Arrival</th>
                <th>Days Overdue</th>
                <th>Invoiced</th>
                <th>Invoice Sent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map(shipment => {
                // Calculate days overdue
                const today = new Date();
                const arrivalDate = new Date(shipment.scheduledArrival);
                const daysOverdue = Math.floor((today - arrivalDate) / (1000 * 60 * 60 * 24));
                
                return (
                  <tr key={shipment._id}>
                    <td>
                      <Moment format="DD/MM/YYYY">{shipment.dateAdded}</Moment>
                    </td>
                    <td>{shipment.customer}</td>
                    <td>{shipment.awbNumber1}</td>
                    <td>
                      <Moment format="DD/MM/YYYY">{shipment.scheduledArrival}</Moment>
                    </td>
                    <td className="number-cell text-danger">{daysOverdue}</td>
                    <td>
                      <span className={shipment.invoiced ? 'text-success' : 'text-danger'}>
                        {shipment.invoiced ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <span className={shipment.invoiceSent ? 'text-success' : 'text-danger'}>
                        {shipment.invoiceSent ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/edit-shipment/${shipment._id}`} className="btn btn-sm btn-primary">
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

OverdueShipments.propTypes = {
  shipments: PropTypes.array.isRequired
};

export default OverdueShipments; 