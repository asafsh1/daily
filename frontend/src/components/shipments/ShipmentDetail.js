import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Moment from 'react-moment';
import { getShipment, clearShipment } from '../../actions/shipment';
import Spinner from '../layout/Spinner';
import ShipmentLegs from './ShipmentLegs';
import { getTrackingUrlSync, hasTracking } from '../../utils/trackingUtils';

const ShipmentDetail = ({
  getShipment,
  clearShipment,
  shipment: { shipment, loading },
  auth: { user }
}) => {
  const { id } = useParams();

  useEffect(() => {
    getShipment(id);

    // Refresh the shipment data every minute to catch updates
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing shipment details');
      getShipment(id);
    }, 60000); // Refresh every 60 seconds

    return () => {
      clearInterval(refreshInterval);
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
                <span className="info-label">Shipment ID:</span>
                <span className="info-value">{shipment._id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Customer:</span>
                <span className="info-value">{shipment.customer?.name || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className={`status-badge status-${shipment.shipmentStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                  {shipment.shipmentStatus}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Created:</span>
                <span className="info-value">
                  <Moment format="DD/MM/YYYY HH:mm">
                    {shipment.createdAt}
                  </Moment>
                </span>
              </div>
            </div>

            <h2>Parties Information</h2>
            <div className="info-group">
              <div className="info-item">
                <span className="info-label">Shipper:</span>
                <span className="info-value">{shipment.shipperName || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Consignee:</span>
                <span className="info-value">{shipment.consigneeName || 'N/A'}</span>
              </div>
              {shipment.notifyParty && (
                <div className="info-item">
                  <span className="info-label">Notify Party:</span>
                  <span className="info-value">{shipment.notifyParty}</span>
                </div>
              )}
            </div>

            <h2>Cargo Information</h2>
            <div className="info-group">
              <div className="info-item">
                <span className="info-label">Weight:</span>
                <span className="info-value">{shipment.weight ? `${shipment.weight} kg` : 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Packages:</span>
                <span className="info-value">{shipment.packageCount || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Order Status:</span>
                <span className="info-value">{shipment.orderStatus || 'N/A'}</span>
              </div>
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
        </div>

        {/* Shipment Legs section - placed in its own container outside the grid */}
        <div className="shipment-section">
          <h2>Shipment Legs</h2>
          <div className="shipment-legs-container">
            <ShipmentLegs shipmentId={id} readOnly={true} />
          </div>
        </div>

        {/* Additional Information in its own container */}
        <div className="shipment-section">
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

        {/* Change Log in its own section */}
        <div className="shipment-section">
          <h2>Change Log</h2>
          <div className="change-log">
            {shipment.changeLog && shipment.changeLog.length > 0 ? (
              shipment.changeLog.map((log, index) => (
                <div key={index} className="log-entry">
                  <div className="log-header">
                    <span className="log-timestamp">
                      <Moment format="DD/MM/YYYY HH:mm">{log.timestamp}</Moment>
                    </span>
                    <span className="log-user">{log.user || 'System'}</span>
                  </div>
                  <div className="log-details">
                    <p><strong>Action:</strong> {log.action || log.description}</p>
                    {log.changes && (
                      <div className="log-changes">
                        {Object.entries(log.changes).map(([field, value]) => (
                          <p key={field}>
                            <strong>{field}:</strong> {JSON.stringify(value)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted">No change history available</p>
            )}
          </div>
        </div>

        <style jsx>{`
          .shipment-section {
            margin-top: 2rem;
            padding: 1rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }

          .change-log {
            margin-top: 1rem;
            max-height: 400px;
            overflow-y: auto;
          }

          .log-entry {
            border: 1px solid #ddd;
            padding: 1rem;
            margin-bottom: 1rem;
            border-radius: 4px;
            background-color: #f9f9f9;
          }

          .log-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #eee;
          }

          .log-timestamp {
            color: #666;
            font-size: 0.9rem;
          }

          .log-user {
            font-weight: bold;
            color: #0d6efd;
          }

          .log-details {
            margin-top: 0.5rem;
          }

          .log-changes {
            margin-top: 0.5rem;
            padding-left: 1rem;
            border-left: 2px solid #eee;
          }

          .text-muted {
            color: #6c757d;
            font-style: italic;
          }
        `}</style>
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