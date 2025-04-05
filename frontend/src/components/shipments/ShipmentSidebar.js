import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const ShipmentSidebar = ({ activeSection, onSectionChange, isEditMode }) => {
  const [currentSection, setCurrentSection] = useState(activeSection || 'basic');

  useEffect(() => {
    if (activeSection) {
      setCurrentSection(activeSection);
    }
  }, [activeSection]);

  const handleClick = (section) => {
    setCurrentSection(section);
    if (onSectionChange) {
      onSectionChange(section);
    }
    
    // Scroll to the section
    const sectionElement = document.getElementById(section);
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="shipment-sidebar">
      <h3 className="sidebar-title">Navigation</h3>
      <ul className="sidebar-nav">
        <li className="sidebar-nav-item">
          <a 
            href="#basic" 
            className={`sidebar-nav-link ${currentSection === 'basic' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleClick('basic');
            }}
          >
            <i className="fas fa-info-circle"></i> Basic Information
          </a>
        </li>
        <li className="sidebar-nav-item">
          <a 
            href="#parties" 
            className={`sidebar-nav-link ${currentSection === 'parties' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleClick('parties');
            }}
          >
            <i className="fas fa-users"></i> Parties Information
          </a>
        </li>
        <li className="sidebar-nav-item">
          <a 
            href="#dimensions" 
            className={`sidebar-nav-link ${currentSection === 'dimensions' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleClick('dimensions');
            }}
          >
            <i className="fas fa-weight"></i> Weight & Dimensions
          </a>
        </li>
        <li className="sidebar-nav-item">
          <a 
            href="#status" 
            className={`sidebar-nav-link ${currentSection === 'status' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleClick('status');
            }}
          >
            <i className="fas fa-check-circle"></i> Shipment Status
          </a>
        </li>
        <li className="sidebar-nav-item">
          <a 
            href="#legs" 
            className={`sidebar-nav-link ${currentSection === 'legs' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleClick('legs');
            }}
          >
            <i className="fas fa-route"></i> Shipment Legs
          </a>
        </li>
        <li className="sidebar-nav-item">
          <a 
            href="#file" 
            className={`sidebar-nav-link ${currentSection === 'file' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleClick('file');
            }}
          >
            <i className="fas fa-file-alt"></i> File Information
          </a>
        </li>
        <li className="sidebar-nav-item">
          <a 
            href="#invoice" 
            className={`sidebar-nav-link ${currentSection === 'invoice' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleClick('invoice');
            }}
          >
            <i className="fas fa-file-invoice-dollar"></i> Invoice Information
          </a>
        </li>
        <li className="sidebar-nav-item">
          <a 
            href="#additional" 
            className={`sidebar-nav-link ${currentSection === 'additional' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleClick('additional');
            }}
          >
            <i className="fas fa-clipboard"></i> Additional Information
          </a>
        </li>
        {!isEditMode && (
          <li className="sidebar-nav-item">
            <a 
              href="#changelog" 
              className={`sidebar-nav-link ${currentSection === 'changelog' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                handleClick('changelog');
              }}
            >
              <i className="fas fa-history"></i> Change Log
            </a>
          </li>
        )}
      </ul>
    </div>
  );
};

ShipmentSidebar.propTypes = {
  activeSection: PropTypes.string,
  onSectionChange: PropTypes.func,
  isEditMode: PropTypes.bool
};

ShipmentSidebar.defaultProps = {
  activeSection: 'basic',
  isEditMode: false
};

export default ShipmentSidebar; 