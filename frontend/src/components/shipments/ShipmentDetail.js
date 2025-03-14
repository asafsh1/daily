import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Moment from 'react-moment';
import { getShipment, clearShipment } from '../../actions/shipment';
import Spinner from '../layout/Spinner';

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
      <Link to="/shipments" className="btn btn-light">
        Back to Shipments
      </Link>
      {user && (user.role === 'admin' || user.role === 'manager') && (
        <Link to={`/edit-shipment/${shipment._id}`} className="btn btn-primary">
          Edit Shipment
        </Link>
      )}

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
                <span className="info-value">{shipment.customer}</span>
              </div>
              <div className="info-item">
                <span className="info-label">AWB Number 1:</span>
                <span className="info-value">{shipment.awbNumber1}</span>
              </div>
              {shipment.awbNumber2 && (
                <div className="info-item">
                  <span className="info-label">AWB Number 2:</span>
                  <span className="info-value">{shipment.awbNumber2}</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Routing:</span>
                <span className="info-value">{shipment.routing}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Scheduled Arrival:</span>
                <span className="info-value">
                  <Moment format="DD/MM/YYYY">
                    {shipment.scheduledArrival}
                  </Moment>
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
                  ${shipment.cost ? shipment.cost.toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Receivables:</span>
                <span className="info-value">{shipment.receivables || 'N/A'}</span>
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