import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { logout } from '../../actions/auth';

const Navbar = ({ auth: { isAuthenticated, loading, user }, logout }) => {
  const authLinks = (
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
      <li>
        <a onClick={logout} href="#!">
          <i className="fas fa-sign-out-alt"></i>{' '}
          <span className="hide-sm">Logout</span>
        </a>
      </li>
      {user && (
        <li>
          <span className="user-badge">
            <i className="fas fa-user"></i> {user.name}
          </span>
        </li>
      )}
    </ul>
  );

  const guestLinks = (
    <ul>
      <li>
        <Link to="/login">
          <i className="fas fa-sign-in-alt"></i>{' '}
          <span className="hide-sm">Login</span>
        </Link>
      </li>
      <li>
        <Link to="/auth-debug">
          <i className="fas fa-bug"></i>{' '}
          <span className="hide-sm">Debug</span>
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
      {!loading && <Fragment>{isAuthenticated ? authLinks : guestLinks}</Fragment>}
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
        
        .user-badge {
          color: #4fc3f7;
          margin-left: 1rem;
        }
      `}</style>
    </nav>
  );
};

Navbar.propTypes = {
  logout: PropTypes.func.isRequired,
  auth: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  auth: state.auth
});

export default connect(mapStateToProps, { logout })(Navbar); 