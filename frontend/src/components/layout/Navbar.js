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
          <Link to="/admin">
            <i className="fas fa-cogs"></i>{' '}
            <span className="hide-sm">Admin Panel</span>
          </Link>
        </li>
      </ul>
      <style jsx>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background-color: #343a40;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.7rem 2rem;
          z-index: 1000;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
      `}</style>
    </nav>
  );
};

export default Navbar; 