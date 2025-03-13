const express = require('express');
const router = express.Router();
const Shipment = require('../../models/Shipment');

// @route   GET api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    // Get total shipments
    const totalShipments = await Shipment.countDocuments();
    
    // Get shipments by status
    const pendingShipments = await Shipment.countDocuments({ shipmentStatus: 'Pending' });
    const arrivedShipments = await Shipment.countDocuments({ shipmentStatus: 'Arrived' });
    const delayedShipments = await Shipment.countDocuments({ shipmentStatus: 'Delayed' });
    const canceledShipments = await Shipment.countDocuments({ shipmentStatus: 'Canceled' });
    
    // Get invoiced vs non-invoiced
    const invoicedShipments = await Shipment.countDocuments({ invoiced: true });
    const nonInvoicedShipments = await Shipment.countDocuments({ invoiced: false });
    
    // Get recent shipments
    const recentShipments = await Shipment.find()
      .sort({ dateAdded: -1 })
      .limit(5);
    
    res.json({
      totalShipments,
      shipmentsByStatus: {
        pending: pendingShipments,
        arrived: arrivedShipments,
        delayed: delayedShipments,
        canceled: canceledShipments
      },
      invoiceStats: {
        invoiced: invoicedShipments,
        nonInvoiced: nonInvoicedShipments
      },
      recentShipments
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/dashboard/monthly-stats
// @desc    Get monthly statistics
// @access  Public
router.get('/monthly-stats', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Use aggregation to get monthly counts in a single query
    const monthlyStats = await Shipment.aggregate([
      {
        $match: {
          dateAdded: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { month: { $month: "$dateAdded" } },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          count: 1
        }
      },
      {
        $sort: { month: 1 }
      }
    ]);
    
    // Fill in missing months with zero counts
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      count: 0
    }));
    
    // Update with actual data
    monthlyStats.forEach(stat => {
      monthlyData[stat.month - 1].count = stat.count;
    });
    
    res.json(monthlyData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/dashboard/overdue-non-invoiced
// @desc    Get shipments with passed arrival dates that aren't invoiced
// @access  Public
router.get('/overdue-non-invoiced', async (req, res) => {
  try {
    const currentDate = new Date();
    
    // Find shipments where:
    // 1. Scheduled arrival date has passed
    // 2. Either not invoiced or invoice not sent
    const overdueShipments = await Shipment.find({
      scheduledArrival: { $lt: currentDate },
      $or: [
        { invoiced: false },
        { invoiceSent: false }
      ]
    }).sort({ scheduledArrival: 1 });
    
    res.json(overdueShipments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 