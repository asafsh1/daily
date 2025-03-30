import React, { useState } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import CustomerManager from './CustomerManager';
import AirlineManager from './AirlineManager';
import UserManager from './UserManager';

const Admin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Determine which tab is active
  const [activeTab, setActiveTab] = useState(() => {
    if (currentPath.includes('/admin/airlines')) return 'airlines';
    if (currentPath.includes('/admin/users')) return 'users';
    return 'customers'; // Default to customers
  });

  // Handle tab click
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    navigate(`/admin/${tab === 'customers' ? '' : tab}`);
  };

  return (
    <section className="container">
      <h1 className="large text-primary">Admin Panel</h1>
      <p className="lead">
        <i className="fas fa-cogs"></i> Manage your system settings and configurations
      </p>

      <div className="admin-tabs">
        <div 
          className={`admin-tab ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => handleTabClick('customers')}
        >
          <i className="fas fa-users"></i> Customers
        </div>
        <div 
          className={`admin-tab ${activeTab === 'airlines' ? 'active' : ''}`}
          onClick={() => handleTabClick('airlines')}
        >
          <i className="fas fa-plane"></i> Airlines
        </div>
        <div 
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => handleTabClick('users')}
        >
          <i className="fas fa-user-cog"></i> Users
        </div>
      </div>

      <div className="admin-content">
        <Routes>
          <Route path="/" element={<CustomerManager />} />
          <Route path="/airlines" element={<AirlineManager />} />
          <Route path="/users" element={<UserManager />} />
        </Routes>
      </div>
    </section>
  );
};

export default Admin; 