import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { getShipments } from '../../actions/shipment';
import Spinner from '../layout/Spinner';
import { Button, Table, Container, Row, Col, Alert } from 'react-bootstrap';

// Super simplified component to debug rendering issues
const Shipments = ({ getShipments, shipment: { shipments, loading, error } }) => {
  const [fetchError, setFetchError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsRetrying(true);
        console.log('Fetching shipments data...');
        const result = await getShipments();
        console.log('Shipments fetched successfully, result:', result);
        setFetchError(null);
        
        // Store debugging info
        setDebugInfo({
          fetchedCount: Array.isArray(result) ? result.length : 'not an array',
          sampleData: Array.isArray(result) && result.length > 0 ? 
            JSON.stringify(result[0]).substring(0, 100) + '...' : 'no data'
        });
      } catch (err) {
        console.error('Failed to fetch shipments:', err);
        setFetchError(err.message || 'Failed to load shipments. Please try again later.');
      } finally {
        setIsRetrying(false);
      }
    };

    fetchData();
  }, [getShipments, retryCount]);

  const handleRetry = () => {
    setRetryCount(prevCount => prevCount + 1);
  };

  // Debugging information
  console.log('Shipments component rendering with state:', { 
    loading, 
    error: error ? JSON.stringify(error) : 'none',
    fetchError,
    shipmentsData: shipments, 
    shipmentsLength: shipments ? shipments.length : 0,
    shipmentsType: shipments ? typeof shipments : 'undefined',
    isArray: Array.isArray(shipments),
    debugInfo
  });

  // Never show error if we have data, regardless of error state
  if (Array.isArray(shipments) && shipments.length > 0) {
    // We have data to display, so ignore any errors
    return (
      <Container>
        <Row className="my-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1>Shipments</h1>
              <Button as={Link} to="/create-shipment" variant="primary">
                Create Shipment
              </Button>
            </div>
            
            {isRetrying && (
              <Alert variant="info" className="mb-3">
                <small>Refreshing shipment data...</small>
              </Alert>
            )}
            
            {/* Ultra simple table with minimal rendering */}
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>#</th>
                  <th>ID</th>
                  <th>Shipper</th>
                  <th>Origin/Destination</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{shipment._id ? shipment._id.toString().substring(0, 8) : 'No ID'}</td>
                    <td>
                      {shipment.shipper ? 
                        (typeof shipment.shipper === 'string' ? 
                          shipment.shipper : 
                          (shipment.shipper.name || 'Unknown')) : 
                        'Unknown'}
                    </td>
                    <td>
                      {(shipment.origin || 'N/A')} → {(shipment.destination || 'N/A')}
                    </td>
                    <td>{shipment.status || 'Pending'}</td>
                    <td>
                      <Button 
                        as={Link} 
                        to={`/shipments/${shipment._id || 'unknown'}`} 
                        variant="outline-primary" 
                        size="sm"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Col>
        </Row>
      </Container>
    );
  }

  // Only show loading state when we're actually loading
  if (loading) {
    return (
      <Container>
        <h1>Shipments</h1>
        <div className="text-center my-5">
          <Spinner />
          <p>Loading shipments...</p>
        </div>
      </Container>
    );
  }

  // We have no data and no loading state - check for errors
  const hasRealError = fetchError || (error && error.msg);
  
  // Show debug version of error screen with more info
  return (
    <Container>
      <h1>Shipments</h1>
      <Alert variant={hasRealError ? "danger" : "warning"}>
        <Alert.Heading>{hasRealError ? "Error Loading Shipments" : "No Shipments Found"}</Alert.Heading>
        
        {hasRealError && <p>{fetchError || (error && error.msg) || 'Unknown error'}</p>}
        
        {!hasRealError && (
          <p>No shipments were found in the database. You can create a new shipment using the button below.</p>
        )}
        
        <div className="d-flex justify-content-between mt-3">
          <Button onClick={handleRetry} variant="primary">Retry Loading</Button>
          <Button as={Link} to="/create-shipment" variant="success">Create Shipment</Button>
        </div>
        
        <div className="mt-4 pt-3 border-top">
          <small className="text-muted">Debug Info:</small>
          <pre style={{fontSize: '0.8rem'}}>
            {JSON.stringify({
              fetchedData: debugInfo,
              reduxState: {
                loading,
                error: error ? JSON.stringify(error) : 'none',
                shipments: Array.isArray(shipments) ? 
                  `Array(${shipments.length})` : 
                  (shipments ? typeof shipments : 'undefined')
              }
            }, null, 2)}
          </pre>
        </div>
      </Alert>
    </Container>
  );
};

Shipments.propTypes = {
  getShipments: PropTypes.func.isRequired,
  shipment: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  shipment: state.shipment
});

export default connect(mapStateToProps, { getShipments })(Shipments); 
