import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Moment from 'react-moment';
import { getShipment, clearShipment } from '../../actions/shipment';
import Spinner from '../layout/Spinner';
import ShipmentLegs from './ShipmentLegs';
import ShipmentSidebar from './ShipmentSidebar';
import { getTrackingUrlSync, hasTracking } from '../../utils/trackingUtils';
import axios from 'axios';

const ShipmentDetail = ({
  getShipment,
  clearShipment,
  shipment: { shipment, loading: shipmentLoading },
  auth: { user },
  dispatch
}) => {
  const { id } = useParams();
  const [activeSection, setActiveSection] = useState('basic');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log(`ShipmentDetail - Loading shipment with ID: ${id}`);
    
    const fetchShipmentData = async () => {
      try {
        // Call the Redux action to get the shipment
        const shipmentData = await getShipment(id);
        
        if (shipmentData) {
          setLoading(false);
        }
        
        // No need for direct API calls for debugging if the Redux action succeeded
        if (shipmentData && shipmentData._id) {
          console.log('Shipment successfully loaded via Redux action');
          return;
        }
        
        // If we get here, the Redux action may have failed, try direct API call
        console.log('Making direct API call to check raw shipment data');
        try {
          // First try the public endpoint which doesn't require authentication
          const rawResponse = await axios.get(`/api/shipments/public/${id}`);
          
          // Check if the response is valid JSON
          if (typeof rawResponse.data === 'object') {
            // Log the raw data to help with debugging
            console.log('Raw shipment data from public endpoint:', rawResponse.data);
            console.log('Legs in raw data:', 
              rawResponse.data.legs ? 
              `Found ${rawResponse.data.legs.length} legs` : 
              'No legs found in raw data');
              
            // If Redux action failed but direct call succeeded, manually update Redux store
            if (!shipmentData || !shipmentData._id) {
              dispatch({
                type: 'GET_SHIPMENT',
                payload: rawResponse.data
              });
              setLoading(false);
            }
          } else if (typeof rawResponse.data === 'string' && rawResponse.data.includes('<!doctype html>')) {
            // Detected HTML response instead of JSON
            console.error('Received HTML instead of JSON from public endpoint - this indicates a routing issue');
            
            // Try a different endpoint format as fallback
            try {
              console.log('Trying alternative API endpoint format...');
              const alternativeResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'https://daily-shipment-tracker.onrender.com'}/api/shipments/public/${id}`);
              
              if (typeof alternativeResponse.data === 'object') {
                console.log('Alternative endpoint worked!', alternativeResponse.data);
                
                // Update Redux store
                dispatch({
                  type: 'GET_SHIPMENT',
                  payload: alternativeResponse.data
                });
                setLoading(false);
              }
            } catch (altErr) {
              console.error('Alternative endpoint also failed:', altErr);
            }
          } else {
            console.error('Received non-JSON/non-HTML response from public endpoint');
            // Try the authenticated endpoint as fallback
            const authResponse = await axios.get(`/api/shipments/${id}`);
            console.log('Raw shipment data from authenticated endpoint:', authResponse.data);
          }
        } catch (directErr) {
          console.error('Error in direct API call:', directErr);
          // If both endpoints fail, create a placeholder for UI rendering
          if (!shipment && shipmentLoading) {
            console.log('Creating placeholder shipment data for UI rendering');
            // This won't be saved to Redux, just displayed while loading
            setLoading(false);
            setError('Could not load shipment data. Please try again later.');
          }
        }
      } catch (err) {
        console.error('Error fetching shipment data:', err);
        setLoading(false);
        setError('Failed to load shipment data');
      }
    };
    
    fetchShipmentData();
    
    return () => {
      clearShipment();
    };
  }, [getShipment, clearShipment, id, shipment, shipmentLoading, dispatch]);

  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  // Add a helper function to extract leg information
  const getOriginDestination = () => {
    if (!shipment) return { origin: 'N/A', destination: 'N/A' };
    
    let origin = shipment.origin || 'N/A';
    let destination = shipment.destination || 'N/A';
    
    // Try to extract from legs if available
    if (shipment.legs && Array.isArray(shipment.legs) && shipment.legs.length > 0) {
      // First leg origin
      if (shipment.legs[0].from) {
        origin = shipment.legs[0].from;
      } else if (shipment.legs[0].origin) {
        origin = shipment.legs[0].origin;
      }
      
      // Last leg destination
      const lastLeg = shipment.legs[shipment.legs.length - 1];
      if (lastLeg.to) {
        destination = lastLeg.to;
      } else if (lastLeg.destination) {
        destination = lastLeg.destination;
      }
    }
    
    return { origin, destination };
  };

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

      <h1 className="large text-primary">Shipment Details</h1>
      <p className="lead">
        <i className="fas fa-shipping-fast"></i>{' '}
        View detailed information about this shipment
      </p>
      
      <div className="shipment-container">
        <ShipmentSidebar 
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          isEditMode={false}
        />
        
        <div className="shipment-main-content">
          {/* SECTION 1: Basic Information */}
          <div id="basic" className="shipment-section">
            <h2 className="section-title">Basic Information</h2>
            <div className="info-group">
              <div className="info-item">
                <span className="info-label">Shipment ID:</span>
                <span className="info-value">{shipment._id}</span>
              </div>
              {shipment.serialNumber && (
                <div className="info-item">
                  <span className="info-label">Serial Number:</span>
                  <span className="info-value">{shipment.serialNumber}</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Date Added:</span>
                <span className="info-value">
                  <Moment format="DD/MM/YYYY">
                    {shipment.dateAdded}
                  </Moment>
                </span>
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
          </div>

          {/* SECTION 2: Parties Information */}
          <div id="parties" className="shipment-section">
            <h2 className="section-title">Parties Information</h2>
            <div className="info-group">
              <div className="info-item">
                <span className="info-label">Customer:</span>
                <span className="info-value">{shipment.customer?.name || 'N/A'}</span>
              </div>
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
          </div>

          {/* SECTION 3: Weight & Dimensions */}
          <div id="dimensions" className="shipment-section">
            <h2 className="section-title">Weight & Dimensions</h2>
            <div className="info-group">
              <div className="info-item">
                <span className="info-label">Weight:</span>
                <span className="info-value">{shipment.weight ? `${shipment.weight} kg` : 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Packages:</span>
                <span className="info-value">{shipment.packageCount || 'N/A'}</span>
              </div>
              
              {(shipment.length || shipment.width || shipment.height) && (
                <>
                  <div className="info-item">
                    <span className="info-label">Dimensions (L×W×H):</span>
                    <span className="info-value">
                      {shipment.length || 'N/A'} × {shipment.width || 'N/A'} × {shipment.height || 'N/A'} cm
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Volumetric Weight:</span>
                    <span className="info-value">
                      {shipment.volumetricWeight ? `${shipment.volumetricWeight} kg` : 'N/A'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Chargeable Weight:</span>
                    <span className="info-value">
                      {shipment.chargeableWeight ? `${shipment.chargeableWeight} kg` : 'N/A'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* SECTION 4: Shipment Status */}
          <div id="status" className="shipment-section">
            <h2 className="section-title">Shipment Status</h2>
            <div className="info-group">
              <div className="info-item">
                <span className="info-label">Order Status:</span>
                <span className="info-value">{shipment.orderStatus || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Shipment Status:</span>
                <span className="info-value">{shipment.shipmentStatus || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* SECTION 5: Shipment Legs */}
          <div id="legs" className="shipment-section">
            <h2 className="section-title">Shipment Legs</h2>
            <div className="shipment-legs-container">
              <ShipmentLegs shipmentId={id} readOnly={true} />
            </div>
          </div>

          {/* SECTION 6: File Information & Financials */}
          <div id="file" className="shipment-section">
            <h2 className="section-title">File Information & Financials</h2>
            <div className="info-group">
              <div className="info-item">
                <span className="info-label">File Number:</span>
                <span className="info-value">{shipment.fileNumber || 'N/A'}</span>
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
              <div className="info-item">
                <span className="info-label">Cost:</span>
                <span className="info-value">
                  {shipment.cost ? `${parseFloat(shipment.cost).toFixed(2)} USD` : '0.00 USD'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Receivables:</span>
                <span className="info-value">
                  {shipment.receivables ? `${parseFloat(shipment.receivables).toFixed(2)} USD` : '0.00 USD'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 7: Invoice Information */}
          <div id="invoice" className="shipment-section">
            <h2 className="section-title">Invoice Information</h2>
            <div className="info-group">
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
            </div>
          </div>

          {/* SECTION 8: Additional Information */}
          <div id="additional" className="shipment-section">
            <h2 className="section-title">Additional Information</h2>
            <div className="info-group">
              <div className="info-item">
                <span className="info-label">Created By:</span>
                <span className="info-value">{shipment.createdBy || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Comments:</span>
                <span className="info-value">{shipment.comments || 'No comments added'}</span>
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

          {/* SECTION 9: Change Log */}
          <div id="changelog" className="shipment-section">
            <h2 className="section-title">Change Log</h2>
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
                      {log.details && <p>{log.details}</p>}
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
        </div>
      </div>
    </section>
  );
};

ShipmentDetail.propTypes = {
  getShipment: PropTypes.func.isRequired,
  clearShipment: PropTypes.func.isRequired,
  shipment: PropTypes.object.isRequired,
  auth: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
  shipment: state.shipment,
  auth: state.auth
});

export default connect(mapStateToProps, { getShipment, clearShipment })(
  ShipmentDetail
); 