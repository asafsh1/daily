import React from 'react';
import { Link } from 'react-router-dom';
import Moment from 'react-moment';
import PropTypes from 'prop-types';
import { getTrackingUrlSync, hasTracking } from '../../utils/trackingUtils';

const RecentShipments = ({ shipments }) => {
  // Helper function to normalize shipment status and add leg info
  const formatShipmentStatus = (shipment) => {
    if (!shipment.shipmentStatus) return 'Unknown';
    
    // Get base status (In Transit, Pending, etc.)
    const baseStatus = shipment.shipmentStatus.split(' ')[0] + ' ' + 
                     (shipment.shipmentStatus.split(' ')[1] || '');
    
    // Get active leg information
    let activeLeg = null;
    let route = '';
    
    if (shipment.legs && shipment.legs.length > 0) {
      // Find the active leg (first in transit leg, or highest non-pending leg)
      const inTransitLeg = shipment.legs.find(leg => 
        leg.status && leg.status.toLowerCase() === 'in transit'
      );
      
      if (inTransitLeg) {
        activeLeg = inTransitLeg;
      } else {
        // Find highest non-pending leg
        for (let i = shipment.legs.length - 1; i >= 0; i--) {
          if (shipment.legs[i].status && 
              shipment.legs[i].status.toLowerCase() !== 'pending') {
            activeLeg = shipment.legs[i];
            break;
          }
        }
        
        // If no active leg found, use the first one
        if (!activeLeg && shipment.legs.length > 0) {
          activeLeg = shipment.legs[0];
        }
      }
      
      // If we found an active leg, get its info
      if (activeLeg) {
        route = activeLeg.origin && activeLeg.destination ? 
               `${activeLeg.origin}-${activeLeg.destination}` : '';
      }
    }
    
    return {
      status: baseStatus.trim(),
      legInfo: activeLeg ? `Leg${activeLeg.legOrder || ''} ${route}` : '',
      cssClass: `status-badge status-${baseStatus.trim().toLowerCase().replace(/\s+/g, '-')}`
    };
  };

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
          {shipments.map(shipment => {
            // Handle customer display
            const customerName = shipment.customer 
              ? (typeof shipment.customer === 'string' 
                ? shipment.customer 
                : (shipment.customer.name || 'Unknown'))
              : 'Unknown';
              
            // Get formatted status
            const statusInfo = formatShipmentStatus(shipment);
              
            return (
              <tr key={shipment._id}>
                <td>
                  <Moment format="DD/MM/YYYY">{shipment.dateAdded}</Moment>
                </td>
                <td>{customerName}</td>
                <td>
                  {shipment.awbNumber1 ? (
                    hasTracking(shipment.awbNumber1) ? (
                      <a 
                        href={getTrackingUrlSync(shipment.awbNumber1)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="awb-tracking-link"
                        title="Track shipment"
                      >
                        {shipment.awbNumber1} <i className="fas fa-external-link-alt fa-xs"></i>
                      </a>
                    ) : (
                      shipment.awbNumber1
                    )
                  ) : (
                    shipment.legs && shipment.legs.length > 0 && shipment.legs[0].awbNumber ? (
                      hasTracking(shipment.legs[0].awbNumber) ? (
                        <a 
                          href={getTrackingUrlSync(shipment.legs[0].awbNumber)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="awb-tracking-link"
                          title="Track shipment"
                        >
                          {shipment.legs[0].awbNumber} <i className="fas fa-external-link-alt fa-xs"></i>
                        </a>
                      ) : (
                        shipment.legs[0].awbNumber
                      )
                    ) : 'N/A'
                  )}
                </td>
                <td>
                  <span className={statusInfo.cssClass}>
                    {statusInfo.status}
                  </span>
                  {statusInfo.legInfo && (
                    <div className="leg-info">
                      <small>{statusInfo.legInfo}</small>
                    </div>
                  )}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

RecentShipments.propTypes = {
  shipments: PropTypes.array.isRequired
};

export default RecentShipments; 