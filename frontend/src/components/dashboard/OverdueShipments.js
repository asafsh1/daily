import React from 'react';
import { Link } from 'react-router-dom';
import Moment from 'react-moment';
import PropTypes from 'prop-types';

const OverdueShipments = ({ shipments }) => {
  // Helper function to get unique AWBs from shipment legs
  const getUniqueAWBs = (shipment) => {
    if (!shipment.legs || !Array.isArray(shipment.legs) || shipment.legs.length === 0) {
      // For shipments without legs, return any direct AWB numbers
      const awbs = [];
      if (shipment.awbNumber1) awbs.push({awb: shipment.awbNumber1, legNumbers: []});
      if (shipment.awbNumber2) awbs.push({awb: shipment.awbNumber2, legNumbers: []});
      return awbs.length > 0 ? awbs.map(data => data.awb).join(', ') : 'No AWBs';
    }
    
    // Create a map to store AWBs with their corresponding leg numbers
    const awbMap = new Map();
    
    // Process all legs and their AWBs
    shipment.legs.forEach(leg => {
      if (!leg) return;
      
      // Check for all possible AWB fields in the leg
      const awbFields = ['awbNumber', 'awb', 'awbNumber1', 'awbNumber2'];
      let foundAwb = false;
      
      awbFields.forEach(field => {
        const awbValue = leg[field];
        if (awbValue && typeof awbValue === 'string' && awbValue.trim() !== '') {
          foundAwb = true;
          // If this AWB is already in the map, add this leg number to the list
          if (awbMap.has(awbValue)) {
            const existingData = awbMap.get(awbValue);
            existingData.legNumbers.push(leg.legOrder || 'unknown');
          } else {
            // Otherwise create a new entry
            awbMap.set(awbValue, {
              awb: awbValue,
              legNumbers: [leg.legOrder || 'unknown']
            });
          }
        }
      });
      
      // If no AWB was found but there's a MAWB, use the MAWB as the AWB
      if (!foundAwb && leg.mawbNumber && typeof leg.mawbNumber === 'string' && leg.mawbNumber.trim() !== '') {
        if (awbMap.has(leg.mawbNumber)) {
          const existingData = awbMap.get(leg.mawbNumber);
          existingData.legNumbers.push(leg.legOrder || 'unknown');
        } else {
          awbMap.set(leg.mawbNumber, {
            awb: leg.mawbNumber,
            legNumbers: [leg.legOrder || 'unknown'],
            isMawb: true
          });
        }
      }
    });
    
    // Also check for direct AWB properties on the shipment itself
    if (shipment.awbNumber1 && !awbMap.has(shipment.awbNumber1)) {
      awbMap.set(shipment.awbNumber1, {awb: shipment.awbNumber1, legNumbers: []});
    }
    if (shipment.awbNumber2 && !awbMap.has(shipment.awbNumber2)) {
      awbMap.set(shipment.awbNumber2, {awb: shipment.awbNumber2, legNumbers: []});
    }
    
    // Convert the map to an array with formatted AWB strings
    const awbList = Array.from(awbMap.values()).map(data => {
      if (data.isMawb) {
        return `MAWB: ${data.awb}`;
      } else if (data.legNumbers.length > 0) {
        return `${data.awb} (Leg ${data.legNumbers.join('/')})`;
      } else {
        return data.awb;
      }
    });
    
    return awbList.join(', ') || 'No AWBs found';
  };
  
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
                
                // Handle customer display
                const customerName = shipment.customer 
                  ? (typeof shipment.customer === 'string' 
                    ? shipment.customer 
                    : (shipment.customer.name || 'Unknown'))
                  : 'Unknown';
                
                // Get unique AWB numbers
                const awbDisplay = getUniqueAWBs(shipment);
                
                return (
                  <tr key={shipment._id}>
                    <td>
                      <Moment format="DD/MM/YYYY">{shipment.dateAdded}</Moment>
                    </td>
                    <td>{customerName}</td>
                    <td>{awbDisplay}</td>
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