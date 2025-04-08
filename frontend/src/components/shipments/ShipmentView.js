import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import ShipmentStatus from './ShipmentStatus';
import ShipmentLegs from './ShipmentLegs';
import LegDebugger from './LegDebugger';
import ShipmentAttachments from './ShipmentAttachments';
import ShipmentNotes from './ShipmentNotes';
import Spinner from '../layout/Spinner';
import moment from 'moment';
import { toast } from 'react-toastify';

const ShipmentView = () => {
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDebugger, setShowDebugger] = useState(false);
  const { shipmentId } = useParams();
  
  useEffect(() => {
    const fetchShipment = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching shipment with ID: ${shipmentId}`);
        const res = await axios.get(`/api/shipments/${shipmentId}`);
        
        if (res.data) {
          console.log('Shipment data received:', res.data);
          
          // Make sure customer is properly handled whether it's an object or string
          if (typeof res.data.customer === 'string') {
            // If customer is just a string, keep it as is
            res.data.customer = res.data.customer;
          } else if (res.data.customer && typeof res.data.customer === 'object') {
            // If customer is an object, ensure it has a name property
            if (!res.data.customer.name && res.data.customer.customerName) {
              res.data.customer.name = res.data.customer.customerName;
            }
          }
          
          // Normalize field names for consistent display
          const normalizedShipment = {
            ...res.data,
            reference: res.data.reference || res.data.shipmentNumber || res.data.shipmentId || 'N/A',
            origin: res.data.origin || res.data.from || 'N/A',
            destination: res.data.destination || res.data.to || 'N/A',
            etd: res.data.etd || res.data.departureDate || null,
            eta: res.data.eta || res.data.arrivalDate || null,
            carrier: res.data.carrier || res.data.airline || res.data.shippingLine || 'N/A',
            awbNumber: res.data.awbNumber || res.data.trackingNumber || 'N/A',
            pieces: res.data.pieces || res.data.packageCount || 'N/A',
            weight: res.data.weight || 'N/A',
            weightUnit: res.data.weightUnit || 'kg',
            status: res.data.shipmentStatus || res.data.status || 'Pending'
          };
          
          setShipment(normalizedShipment);
        } else {
          setError('No shipment data received');
        }
      } catch (err) {
        console.error('Error fetching shipment:', err);
        setError(`Failed to load shipment: ${err.response?.data?.msg || err.message}`);
        toast.error(`Error: ${err.response?.data?.msg || 'Failed to load shipment'}`);
      } finally {
        setLoading(false);
      }
    };

    if (shipmentId) {
      fetchShipment();
    }
  }, [shipmentId]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return moment(date).format('DD/MM/YYYY');
  };
  
  // Format date and time together
  const formatDateTime = (date, time) => {
    if (!date) return 'N/A';
    
    const dateStr = moment(date).format('DD/MM/YYYY');
    if (!time) return dateStr;
    
    return `${dateStr} ${time}`;
  };

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          {error}
          <button 
            className="btn btn-outline-danger ml-3"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
        <Link to="/shipments" className="btn btn-primary">
          Back to Shipments
        </Link>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          Shipment not found
        </div>
        <Link to="/shipments" className="btn btn-primary">
          Back to Shipments
        </Link>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Shipment: {shipment.reference}</h2>
        <div>
          <Link to={`/shipments/edit/${shipmentId}`} className="btn btn-primary mr-2">
            Edit
          </Link>
          <Link to="/shipments" className="btn btn-secondary">
            Back
          </Link>
          <button 
            className="btn btn-sm btn-outline-info ml-2"
            onClick={() => setShowDebugger(!showDebugger)}
          >
            {showDebugger ? 'Hide Debugger' : 'Debug'}
          </button>
        </div>
      </div>

      {showDebugger && <LegDebugger shipmentId={shipmentId} />}

      <div className="row">
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Shipment Details</h5>
            </div>
            <div className="card-body">
              <table className="table">
                <tbody>
                  <tr>
                    <th>Reference</th>
                    <td>{shipment.reference}</td>
                  </tr>
                  <tr>
                    <th>Order Status</th>
                    <td>{shipment.orderStatus || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Shipment Status</th>
                    <td>{shipment.shipmentStatus || shipment.status || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Customer</th>
                    <td>
                      {(() => {
                        // Handle different customer data formats
                        if (!shipment.customer) return 'N/A';
                        if (typeof shipment.customer === 'string') return shipment.customer;
                        if (shipment.customer.name) return shipment.customer.name;
                        if (shipment.customer.customerName) return shipment.customer.customerName;
                        if (shipment.customer._id) return `Customer ID: ${shipment.customer._id}`;
                        return JSON.stringify(shipment.customer);
                      })()}
                    </td>
                  </tr>
                  <tr>
                    <th>Shipper</th>
                    <td>
                      {(() => {
                        // Handle different shipper data formats
                        if (!shipment.shipper && !shipment.shipperName) return 'N/A';
                        if (shipment.shipperName) return shipment.shipperName;
                        if (typeof shipment.shipper === 'string') return shipment.shipper;
                        if (shipment.shipper && shipment.shipper.name) return shipment.shipper.name;
                        return JSON.stringify(shipment.shipper);
                      })()}
                    </td>
                  </tr>
                  <tr>
                    <th>Consignee</th>
                    <td>
                      {(() => {
                        // Handle different consignee data formats
                        if (!shipment.consignee && !shipment.consigneeName) return 'N/A';
                        if (shipment.consigneeName) return shipment.consigneeName;
                        if (typeof shipment.consignee === 'string') return shipment.consignee;
                        if (shipment.consignee && shipment.consignee.name) return shipment.consignee.name;
                        return JSON.stringify(shipment.consignee);
                      })()}
                    </td>
                  </tr>
                  <tr>
                    <th>Created</th>
                    <td>{formatDate(shipment.createdAt || shipment.dateAdded)}</td>
                  </tr>
                  <tr>
                    <th>Last Updated</th>
                    <td>{formatDate(shipment.updatedAt)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">Shipment Information</h5>
            </div>
            <div className="card-body">
              <table className="table">
                <tbody>
                  <tr>
                    <th>Origin</th>
                    <td>{shipment.origin}</td>
                  </tr>
                  <tr>
                    <th>Destination</th>
                    <td>{shipment.destination}</td>
                  </tr>
                  <tr>
                    <th>ETD</th>
                    <td>{formatDate(shipment.etd)}</td>
                  </tr>
                  <tr>
                    <th>ETA</th>
                    <td>{formatDate(shipment.eta)}</td>
                  </tr>
                  <tr>
                    <th>Carrier</th>
                    <td>{shipment.carrier}</td>
                  </tr>
                  <tr>
                    <th>AWB/Tracking Number</th>
                    <td>{shipment.awbNumber}</td>
                  </tr>
                  <tr>
                    <th>Package Count</th>
                    <td>{shipment.pieces}</td>
                  </tr>
                  <tr>
                    <th>Weight</th>
                    <td>
                      {(() => {
                        if (!shipment.weight) return 'N/A';
                        const weight = parseFloat(shipment.weight);
                        if (isNaN(weight)) return shipment.weight;
                        const unit = shipment.weightUnit || 'kg';
                        return `${weight.toFixed(2)} ${unit}`;
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Preview of legs if available in shipment object */}
      {shipment.legs && Array.isArray(shipment.legs) && shipment.legs.length > 0 && (
        <div className="alert alert-info mb-4">
          <strong>Note:</strong> This shipment has {shipment.legs.length} legs defined directly in the shipment object.
        </div>
      )}

      {/* Shipment Legs */}
      <div className="card mb-4">
        <div className="card-header bg-success text-white">
          <h5 className="mb-0">Shipment Legs</h5>
        </div>
        <div className="card-body">
          <ShipmentLegs shipmentId={shipmentId} readOnly={true} />
        </div>
      </div>

      {/* Attachments */}
      <div className="card mb-4">
        <div className="card-header bg-secondary text-white">
          <h5 className="mb-0">Attachments</h5>
        </div>
        <div className="card-body">
          <ShipmentAttachments shipmentId={shipmentId} readOnly={true} />
        </div>
      </div>

      {/* Notes */}
      <div className="card mb-4">
        <div className="card-header bg-warning">
          <h5 className="mb-0">Notes</h5>
        </div>
        <div className="card-body">
          <ShipmentNotes shipmentId={shipmentId} readOnly={true} />
        </div>
      </div>

      {/* Shipment Change Log */}
      <div className="card mb-4">
        <div className="card-header bg-secondary text-white">
          <h5 className="mb-0">Change Log</h5>
        </div>
        <div className="card-body">
          {shipment.changeLog && shipment.changeLog.length > 0 ? (
            <ul className="list-group">
              {shipment.changeLog.map((log, index) => (
                <li key={index} className="list-group-item">
                  <div className="d-flex justify-content-between">
                    <span>
                      <strong>{log.action || 'Changed'}: </strong>
                      {log.details || log.description || 'No details'}
                    </span>
                    <small>{moment(log.timestamp).format('YYYY-MM-DD HH:mm')}</small>
                  </div>
                  {log.user && <small className="text-muted">By: {log.user}</small>}
                </li>
              ))}
            </ul>
          ) : (
            <p>No change history available for this shipment.</p>
          )}
        </div>
      </div>

      {/* Debug Info - Only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="card mb-4">
          <div className="card-header bg-dark text-white">
            <h5 className="mb-0">Debug Information</h5>
          </div>
          <div className="card-body">
            <pre className="bg-light p-3" style={{ maxHeight: '200px', overflow: 'auto' }}>
              {JSON.stringify(shipment, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentView; 