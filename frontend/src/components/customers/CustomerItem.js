import React from 'react';
import PropTypes from 'prop-types';

const CustomerItem = ({ customer, onDelete, onEdit }) => {
  const { _id, name, contactPerson, email, phone } = customer;

  return (
    <tr>
      <td>{name}</td>
      <td>{contactPerson || 'N/A'}</td>
      <td>{email || 'N/A'}</td>
      <td>{phone || 'N/A'}</td>
      <td>
        <button
          onClick={() => onEdit(customer)}
          className="btn btn-primary btn-sm"
          title="Edit Customer"
        >
          <i className="fas fa-edit"></i>
        </button>
        <button
          onClick={() => onDelete(_id)}
          className="btn btn-danger btn-sm"
          title="Delete Customer"
        >
          <i className="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  );
};

CustomerItem.propTypes = {
  customer: PropTypes.object.isRequired,
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired
};

export default CustomerItem; 