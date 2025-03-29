import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Moment from 'react-moment';
import { getShipment, clearShipment } from '../../actions/shipment';
import Spinner from '../layout/Spinner';
import ShipmentLegs from './ShipmentLegs';

const ShipmentDetail = ({
  getShipment,
  clearShipment,
  shipment: { shipment, loading },
  auth: { user }
}) => {
  const { id } = useParams();

  useEffect(() => {
    getShipment(id);

    return () => {
      clearShipment();
    };
  }, [getShipment, clearShipment, id]);

  return loading || shipment === null ? (
    <Spinner />
  ) : (
    <section className="container">
      <div className="shipment-detail-header">
        <div className="shipment-detail-actions">
          <Link to="/shipments" className="btn btn-light">
            <i className="fas fa-arrow-left"></i> Back to Shipments
          </Link>
          {user && (user.role === 'admin' || user.role === 'manager') && (
            <Link to={`/edit-shipment/${shipment._id}`} className="btn btn-primary">
              <i className="fas fa-edit"></i> Edit Shipment
            </Link>
          )}
        </div>
      </div>

      <div className="shipment-detail">
        <h1 className="large text-primary">Shipment Details</h1>

        <div className="shipment-grid">
          <div className="shipment-info">
            <h2>Basic Information</h2>
            <div className="info-group">
              <div className="info-item">
                <span className="info-label">Date Added:</span>
                <span className="info-value">
                  <Moment format="DD/MM/YYYY">{shipment.dateAdded}</Moment>
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Created By:</span>
                <span className="info-value">
                  {shipment.createdBy || 'Not specified'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Order Status:</span>
                <span className="info-value">{shipment.orderStatus}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Customer:</span>
                <span className="info-value">{shipment.customer?.name || 'Unknown'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">AWB Numbers:</span>
                <span className="info-value">
                  {shipment.legs && shipment.legs.length > 0 ? (
                    <div className="awb-list">
                      {shipment.legs.map((leg, index) => (
                        leg.awbNumber && <div key={index}>{leg.awbNumber}</div>
                      ))}
                    </div>
                  ) : (
                    'No AWBs'
                  )}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Routing:</span>
                <span className="info-value">
                  {shipment.legs && shipment.legs.length > 0 ? (
                    shipment.legs.map((leg, index) => (
                      <span key={index}>
                        {index === 0 ? leg.origin : ''} → {leg.destination}
                        {index < shipment.legs.length - 1 ? ' → ' : ''}
                      </span>
                    ))
                  ) : (
                    'No routing information'
                  )}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">First Departure:</span>
                <span className="info-value">
                  {shipment.legs && shipment.legs.length > 0 ? (
                    <Moment format="DD/MM/YYYY HH:mm">{shipment.legs[0].departureTime}</Moment>
                  ) : (
                    'N/A'
                  )}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Final Arrival:</span>
                <span className="info-value">
                  {shipment.legs && shipment.legs.length > 0 ? (
                    <Moment format="DD/MM/YYYY HH:mm">{shipment.legs[shipment.legs.length - 1].arrivalTime}</Moment>
                  ) : (
                    'N/A'
                  )}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Shipment Status:</span>
                <span
                  className={`status-badge status-${shipment.shipmentStatus.toLowerCase()}`}
                >
                  {shipment.shipmentStatus}
                </span>
              </div>
              {shipment.weight && (
                <div className="info-item">
                  <span className="info-label">Weight:</span>
                  <span className="info-value">{shipment.weight} kg</span>
                </div>
              )}
              {shipment.packageCount && (
                <div className="info-item">
                  <span className="info-label">Package Count:</span>
                  <span className="info-value">{shipment.packageCount}</span>
                </div>
              )}
            </div>
          </div>

          <div className="shipment-info">
            <h2>File Information</h2>
            <div className="info-group">
              <div className="info-item">
                <span className="info-label">File Number:</span>
                <span className="info-value">{shipment.fileNumber}</span>
              </div>
              <div className="info-item">
                <span className="info-label">File Created Date:</span>
                <span className="info-value">
                  {shipment.fileCreatedDate ? (
                    <Moment format="DD/MM/YYYY">
                      {shipment.fileCreatedDate}
                    </Moment>
                  ) : (
                    'N/A'
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="shipment-info">
            <h2>Invoice Information</h2>
            <div className="info-group">
              <div className="info-item">
                <span className="info-label">Invoiced:</span>
                <span className="info-value">
                  {shipment.invoiced ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Invoice Sent:</span>
                <span className="info-value">
                  {shipment.invoiceSent ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Cost:</span>
                <span className="info-value">
                  {shipment.cost ? shipment.cost.toFixed(2) : '0.00'} USD
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Receivables:</span>
                <span className="info-value">
                  {shipment.receivables ? parseFloat(shipment.receivables).toFixed(2) : '0.00'} USD
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Invoice Number:</span>
                <span className="info-value">
                  {shipment.invoiceNumber || 'N/A'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Invoice Status:</span>
                <span className="info-value">
                  {shipment.invoiceStatus || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="shipment-info">
            <h2>Additional Information</h2>
            <div className="info-group">
              <div className="info-item">
                <span className="info-label">Comments:</span>
                <span className="info-value">{shipment.comments || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Last Updated:</span>
                <span className="info-value">
                  <Moment format="DD/MM/YYYY HH:mm">
                    {shipment.updatedAt}
                  </Moment>
                </span>
              </div>
            </div>
          </div>
        </div>

        <h2 className="shipment-detail-heading">Shipment Details</h2>
        <div className="shipment-header">
          <h3>
            AWB: {shipment.legs && shipment.legs.length > 0 
              ? shipment.legs.map(leg => leg.awbNumber).filter(Boolean).join(', ') 
              : 'No AWB'}
          </h3>
          <p className={`status-badge ${shipment.shipmentStatus.toLowerCase()}`}>
            {shipment.shipmentStatus}
          </p>
        </div>

        <div className="shipment-info">
          <div className="column">
            <p><strong>Customer:</strong> {shipment.customer?.name || 'Unknown'}</p>
            <p><strong>Origin:</strong> {shipment.legs && shipment.legs.length > 0 ? shipment.legs[0].origin : 'N/A'}</p>
            <p><strong>Destination:</strong> {shipment.legs && shipment.legs.length > 0 ? shipment.legs[shipment.legs.length - 1].destination : 'N/A'}</p>
            <p><strong>Date Added:</strong> <Moment format="DD/MM/YYYY">{shipment.dateAdded}</Moment></p>
            <p><strong>Weight:</strong> {shipment.weight || 'N/A'} kg</p>
          </div>
          <div className="column">
            <p><strong>Order Status:</strong> {shipment.orderStatus}</p>
            <p><strong>First Departure:</strong> {shipment.legs && shipment.legs.length > 0 ? 
              <Moment format="DD/MM/YYYY HH:mm">{shipment.legs[0].departureTime}</Moment> : 'N/A'}</p>
            <p><strong>Final Arrival:</strong> {shipment.legs && shipment.legs.length > 0 ? 
              <Moment format="DD/MM/YYYY HH:mm">{shipment.legs[shipment.legs.length - 1].arrivalTime}</Moment> : 'N/A'}</p>
            <p><strong>Routing:</strong> {shipment.legs && shipment.legs.length > 0 ? 
              shipment.legs.map((leg, i) => i === 0 ? leg.origin : '').filter(Boolean).join('') + ' → ' + 
              shipment.legs.map(leg => leg.destination).join(' → ') : 'N/A'}</p>
            <p><strong>Package Count:</strong> {shipment.packageCount || 'N/A'}</p>
          </div>
        </div>

        {/* Shipment Legs section - placed before file information as requested */}
        <div className="shipment-legs-section">
          <ShipmentLegs shipmentId={id} readOnly={true} />
        </div>

        <div className="action-buttons">
          {/* ... existing code ... */}
        </div>
      </div>
    </section>
  );
};

ShipmentDetail.propTypes = {
  getShipment: PropTypes.func.isRequired,
  clearShipment: PropTypes.func.isRequired,
  shipment: PropTypes.object.isRequired,
  auth: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  shipment: state.shipment,
  auth: state.auth
});

export default connect(mapStateToProps, { getShipment, clearShipment })(
  ShipmentDetail
); 