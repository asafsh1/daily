# Shipment Tracker

A full-stack application for tracking shipments, managing orders, and handling invoicing.

## Features

- Shipment management with real-time updates
- Order status tracking
- Invoice management
- Dashboard with analytics
- Real-time notifications using Socket.io
- Responsive design for mobile and desktop

## Tech Stack

- **Frontend**: React, Redux, Socket.io-client
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Real-time**: Socket.io

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/shipment-tracker.git
   cd shipment-tracker
   ```

2. Install dependencies:
   ```bash
   # Install root dependencies
   npm install

   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. Set up environment variables:
   ```bash
   # Backend setup
   cd backend
   cp .env.example .env
   # Edit .env with your configuration

   # Frontend setup
   cd ../frontend
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the development servers:
   ```bash
   # Start backend (from backend directory)
   npm run server

   # Start frontend (from frontend directory)
   npm start
   ```

## Deployment

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Set up environment variables on your hosting platform:
   - Set all variables from `.env.example` files
   - Update `MONGODB_URI` to your production database
   - Update `CORS_ORIGIN` to your frontend domain
   - Set `NODE_ENV=production`

3. Deploy the backend:
   - Deploy the backend directory to your hosting platform
   - Start the server using `npm start`

4. Deploy the frontend:
   - Deploy the contents of `frontend/build` to your static hosting service
   - Configure your hosting service to handle client-side routing

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 