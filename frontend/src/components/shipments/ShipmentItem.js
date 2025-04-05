import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import Moment from 'react-moment';

const ShipmentItem = ({ shipment, index }) => {
  // Emergency log to debug issues
  console.log('Rendering ShipmentItem:', index, shipment);
  
  // Super simple rendering - no complex property access
  // This ensures we avoid any property access errors
  
  // Use very simple property access with explicit null checks
  const id = shipment && shipment._id ? shipment._id : 'unknown';
  const shipper = shipment && shipment.shipper ? 
    (typeof shipment.shipper === 'string' ? shipment.shipper : 
      (shipment.shipper.name ? shipment.shipper.name : 'Unknown')) 
    : 'Unknown';
  
  // Use very basic rendering that won't throw errors
  return (
    <tr>
      <td>{index + 1}</td>
      <td>{shipper}</td>
      <td>{shipment && shipment.origin ? shipment.origin : 'N/A'}</td>
      <td>{shipment && shipment.destination ? shipment.destination : 'N/A'}</td>
      <td>
        <span className="badge bg-secondary">
          {shipment && shipment.status ? shipment.status : 'Pending'}
        </span>
      </td>
      <td>{shipment && shipment.mode ? shipment.mode : 'N/A'}</td>
      <td>
        {shipment && shipment.dateAdded ? (
          <Moment format="MM/DD/YYYY">{shipment.dateAdded}</Moment>
        ) : (
          'N/A'
        )}
      </td>
      <td>
        <Button 
          as={Link} 
          to={`/shipments/${id}`} 
          variant="outline-primary" 
          size="sm"
        >
          View
        </Button>
      </td>
    </tr>
  );
};

ShipmentItem.propTypes = {
  shipment: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired
};

export default ShipmentItem; 