import React from 'react';
import PropTypes from 'prop-types';

const AirlineItem = ({ airline, onEdit, onDelete }) => {
  return (
    <tr>
      <td>{airline.code}</td>
      <td>{airline.name}</td>
      <td>
        <div className="url-template" title={airline.trackingUrlTemplate}>
          {airline.trackingUrlTemplate.length > 40 
            ? airline.trackingUrlTemplate.substring(0, 40) + '...' 
            : airline.trackingUrlTemplate}
        </div>
      </td>
      <td>
        <span className={`badge ${airline.active ? 'badge-success' : 'badge-secondary'}`}>
          {airline.active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td>
        <button 
          onClick={() => onEdit(airline)} 
          className="btn btn-sm btn-primary"
        >
          <i className="fas fa-edit"></i>
        </button>
        <button 
          onClick={() => onDelete(airline._id)} 
          className="btn btn-sm btn-danger"
        >
          <i className="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  );
};

AirlineItem.propTypes = {
  airline: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default AirlineItem; 