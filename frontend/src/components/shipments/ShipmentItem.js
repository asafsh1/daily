import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import Moment from 'react-moment';

const ShipmentItem = ({ shipment, index }) => {
  // Guard against invalid shipment objects
  if (!shipment || typeof shipment !== 'object') {
    console.error('Invalid shipment data received:', shipment);
    return null; // Don't render anything for invalid data
  }

  // Ensure shipment has an _id
  if (!shipment._id) {
    console.error('Shipment missing _id:', shipment);
    return null;
  }

  // Get display values with fallbacks
  const shipperName = shipment.shipper && shipment.shipper.name 
    ? shipment.shipper.name 
    : (typeof shipment.shipper === 'string' ? shipment.shipper : 'Unknown');
  
  const origin = shipment.origin || 
    (shipment.legs && shipment.legs[0] && shipment.legs[0].origin) || 
    'N/A';
  
  const destination = shipment.destination || 
    (shipment.legs && shipment.legs.length > 0 && shipment.legs[shipment.legs.length-1].destination) || 
    'N/A';
  
  const status = shipment.status || shipment.shipmentStatus || 'Pending';
  const mode = shipment.mode || shipment.transportMode || 'Air';
  const dateAdded = shipment.dateAdded || new Date();

  // Get status badge class based on status
  const getStatusClass = (status) => {
    if (!status) return 'bg-secondary';
    
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-success';
      case 'in transit':
        return 'bg-primary';
      case 'pending':
        return 'bg-warning';
      case 'canceled':
        return 'bg-danger';
      case 'delayed':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <tr>
      <td>{index + 1}</td>
      <td>{shipperName}</td>
      <td>{origin}</td>
      <td>{destination}</td>
      <td>
        <span className={`badge ${getStatusClass(status)}`}>
          {status}
        </span>
      </td>
      <td>{mode}</td>
      <td>
        {dateAdded ? (
          <Moment format="MM/DD/YYYY">{dateAdded}</Moment>
        ) : (
          'N/A'
        )}
      </td>
      <td>
        <Button 
          as={Link} 
          to={`/shipments/${shipment._id}`} 
          variant="outline-primary" 
          size="sm"
          className="me-1"
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