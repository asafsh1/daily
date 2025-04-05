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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsRetrying(true);
        console.log('Fetching shipments data...');
        await getShipments();
        console.log('Shipments fetched successfully');
        setFetchError(null);
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
    error, 
    shipmentsData: shipments, 
    shipmentsLength: shipments ? shipments.length : 0,
    shipmentsType: shipments ? typeof shipments : 'undefined',
    isArray: Array.isArray(shipments)
  });

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

  if (fetchError || error) {
    return (
      <Container>
        <h1>Shipments</h1>
        <Alert variant="danger">
          <Alert.Heading>Error Loading Shipments</Alert.Heading>
          <p>{fetchError || (error ? error.msg : 'Unknown error')}</p>
          <Button onClick={handleRetry} variant="outline-danger">Retry</Button>
        </Alert>
      </Container>
    );
  }

  // Most minimal rendering possible for shipments
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
        
          {/* Ultra simple table with minimal rendering */}
          {Array.isArray(shipments) && shipments.length > 0 ? (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>#</th>
                  <th>ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{shipment._id ? shipment._id.toString().substring(0, 8) : 'No ID'}</td>
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
          ) : (
            <Alert variant="info">
              No shipments found. Click "Create Shipment" to add one.
            </Alert>
          )}
        </Col>
      </Row>
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
