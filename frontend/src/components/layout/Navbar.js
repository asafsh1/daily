import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="navbar bg-dark">
      <h1>
        <Link to="/">
          <i className="fas fa-truck-loading"></i> Shipment Tracker
        </Link>
      </h1>
      <ul>
        <li>
          <Link to="/dashboard">
            <i className="fas fa-tachometer-alt"></i>{' '}
            <span className="hide-sm">Dashboard</span>
          </Link>
        </li>
        <li>
          <Link to="/shipments">
            <i className="fas fa-shipping-fast"></i>{' '}
            <span className="hide-sm">Shipments</span>
          </Link>
        </li>
        <li>
          <Link to="/customers">
            <i className="fas fa-users"></i>{' '}
            <span className="hide-sm">Customers</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar; 