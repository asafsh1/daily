import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

// Alert component - updated for database connectivity fix
const Alert = ({ alerts }) =>
  alerts !== null &&
  alerts.length > 0 && (
    <div className="alert-container">
      {alerts.map(alert => (
        <div key={alert.id} className={`alert alert-${alert.alertType}`}>
          {alert.msg}
        </div>
      ))}
    </div>
  );

Alert.propTypes = {
  alerts: PropTypes.array.isRequired
};

const mapStateToProps = state => ({
  alerts: state.alert
});

export default connect(mapStateToProps)(Alert); 