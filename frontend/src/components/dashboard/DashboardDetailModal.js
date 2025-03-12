import React from 'react';
import { Link } from 'react-router-dom';
import Moment from 'react-moment';
import PropTypes from 'prop-types';

const DashboardDetailModal = ({ isOpen, onClose, title, data, type }) => {
  if (!isOpen) return null;

  const renderContent = () => {
    switch (type) {
      case 'shipment-status':
        return renderShipmentStatusTable();
      case 'order-status':
        return renderOrderStatusTable();
      case 'invoicing':
        return renderInvoicingTable();
      default:
        return <p>No data available</p>;
    }
  };

  const renderShipmentStatusTable = () => {
    return (
      <table className="table">
        <thead>
          <tr>
            <th>Date Added</th>
            <th>Customer</th>
            <th>AWB</th>
            <th>Shipment Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map(shipment => (
            <tr key={shipment._id}>
              <td>
                <Moment format="DD/MM/YYYY">{shipment.dateAdded}</Moment>
              </td>
              <td>{shipment.customer}</td>
              <td>{shipment.awbNumber1}</td>
              <td>
                <span className={`status-badge status-${shipment.shipmentStatus.toLowerCase()}`}>
                  {shipment.shipmentStatus}
                </span>
              </td>
              <td>
                <Link to={`/shipments/${shipment._id}`} className="btn btn-sm btn-primary">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderOrderStatusTable = () => {
    return (
      <table className="table">
        <thead>
          <tr>
            <th>Date Added</th>
            <th>Customer</th>
            <th>AWB</th>
            <th>Order Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map(shipment => (
            <tr key={shipment._id}>
              <td>
                <Moment format="DD/MM/YYYY">{shipment.dateAdded}</Moment>
              </td>
              <td>{shipment.customer}</td>
              <td>{shipment.awbNumber1}</td>
              <td>
                <span className={`status-badge order-status-${shipment.orderStatus.replace(/\s+/g, '-').toLowerCase()}`}>
                  {shipment.orderStatus}
                </span>
              </td>
              <td>
                <Link to={`/shipments/${shipment._id}`} className="btn btn-sm btn-primary">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderInvoicingTable = () => {
    return (
      <table className="table">
        <thead>
          <tr>
            <th>Date Added</th>
            <th>Customer</th>
            <th>AWB</th>
            <th>Invoiced</th>
            <th>Invoice Sent</th>
            <th>Invoice Number</th>
            <th>Invoice Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map(shipment => (
            <tr key={shipment._id}>
              <td>
                <Moment format="DD/MM/YYYY">{shipment.dateAdded}</Moment>
              </td>
              <td>{shipment.customer}</td>
              <td>{shipment.awbNumber1}</td>
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
              <td>{shipment.invoiceNumber || 'N/A'}</td>
              <td>{shipment.invoiceStatus || 'N/A'}</td>
              <td>
                <Link to={`/edit-shipment/${shipment._id}`} className="btn btn-sm btn-primary">
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="btn-close">
            &times;
          </button>
        </div>
        <div className="modal-body">
          {data && data.length > 0 ? (
            <div className="table-responsive">{renderContent()}</div>
          ) : (
            <p>No data available</p>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

DashboardDetailModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  data: PropTypes.array.isRequired,
  type: PropTypes.string.isRequired
};

export default DashboardDetailModal; 