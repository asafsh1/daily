import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const links = (
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
    </ul>
  );

  return (
    <nav className="navbar bg-dark">
      <h1>
        <Link to="/">
          <i className="fas fa-truck-loading"></i> Shipment Tracker
        </Link>
      </h1>
      {links}
    </nav>
  );
};

export default Navbar; 