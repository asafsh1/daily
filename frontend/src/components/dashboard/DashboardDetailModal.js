import React from 'react';
import { Link } from 'react-router-dom';
import Moment from 'react-moment';
import PropTypes from 'prop-types';

const DashboardDetailModal = ({ isOpen, onClose, title, data, type }) => {
  if (!isOpen) return null;

  const renderContent = () => {
    switch (type) {
      case 'total-shipments':
        return renderShipmentTable();
      case 'shipment-status':
        return renderShipmentStatusTable();
      case 'order-status':
        return renderOrderStatusTable();
      case 'invoicing':
        return renderInvoicingTable();
      case 'total-cost':
        return renderCostTable();
      case 'total-receivables':
        return renderReceivablesTable();
      case 'total-profit':
        return renderProfitTable();
      default:
        return <p>No data available</p>;
    }
  };

  const renderShipmentTable = () => {
    return (
      <table className="table">
        <thead>
          <tr>
            <th>Date Added</th>
            <th>Customer</th>
            <th>AWB</th>
            <th>Order Status</th>
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
                <span className={`status-badge order-status-${shipment.orderStatus ? shipment.orderStatus.replace(/\s+/g, '-').toLowerCase() : 'unknown'}`}>
                  {shipment.orderStatus || 'Unknown'}
                </span>
              </td>
              <td>
                <span className={`status-badge status-${shipment.shipmentStatus ? shipment.shipmentStatus.toLowerCase() : 'unknown'}`}>
                  {shipment.shipmentStatus || 'Unknown'}
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

  const renderCostTable = () => {
    return (
      <table className="table">
        <thead>
          <tr>
            <th>Date Added</th>
            <th>Customer</th>
            <th>AWB</th>
            <th>Cost</th>
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
              <td className="number-cell">
                ${shipment.cost ? parseFloat(shipment.cost).toFixed(2) : '0.00'}
              </td>
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

  const renderReceivablesTable = () => {
    return (
      <table className="table">
        <thead>
          <tr>
            <th>Date Added</th>
            <th>Customer</th>
            <th>AWB</th>
            <th>Receivables</th>
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
              <td className="number-cell">
                ${shipment.receivables ? parseFloat(shipment.receivables).toFixed(2) : '0.00'}
              </td>
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

  const renderProfitTable = () => {
    return (
      <table className="table">
        <thead>
          <tr>
            <th>Date Added</th>
            <th>Customer</th>
            <th>AWB</th>
            <th>Receivables</th>
            <th>Cost</th>
            <th>Profit</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map(shipment => {
            const receivables = shipment.receivables || 0;
            const cost = shipment.cost || 0;
            const profit = receivables - cost;
            const isProfitable = profit >= 0;
            
            return (
              <tr key={shipment._id}>
                <td>
                  <Moment format="DD/MM/YYYY">{shipment.dateAdded}</Moment>
                </td>
                <td>{shipment.customer}</td>
                <td>{shipment.awbNumber1}</td>
                <td className="number-cell">
                  ${parseFloat(receivables).toFixed(2)}
                </td>
                <td className="number-cell">
                  ${parseFloat(cost).toFixed(2)}
                </td>
                <td className={`number-cell ${isProfitable ? 'text-success' : 'text-danger'}`}>
                  ${parseFloat(profit).toFixed(2)}
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