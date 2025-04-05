import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import Moment from 'react-moment';

const ShipmentItem = ({ shipment, index }) => {
  // Get display values with fallbacks
  const shipperName = shipment.shipper?.name || 'Unknown';
  const origin = shipment.origin || 'N/A';
  const destination = shipment.destination || 'N/A';
  const status = shipment.status || 'Pending';
  const mode = shipment.mode || 'Air';
  const dateAdded = shipment.dateAdded || new Date();

  // Get status badge class based on status
  const getStatusClass = (status) => {
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
        <Moment format="MM/DD/YYYY">{dateAdded}</Moment>
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