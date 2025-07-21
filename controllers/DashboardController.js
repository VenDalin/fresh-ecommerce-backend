const mongoose = require('mongoose')

const DashboardController = {
  getDashboardData: async (req, res) => {
    try {
      const db = mongoose.connection.db

      const ordersCollection = db.collection('orders')
      const productsCollection = db.collection('products')
      const customerordersCollection = db.collection('customerorders')

      // Total Orders Count
      const totalOrders = await ordersCollection.countDocuments()

      // Total Sales (Sum of totalAmount for paid orders)
      const totalSalesAgg = await ordersCollection.aggregate([
        { $match: { paymentStatus: 'Paid' } },
        { $group: { _id: null, totalSales: { $sum: '$totalAmount' } } }
      ]).toArray()
      const totalSales = totalSalesAgg[0]?.totalSales || 0

      // Orders Per Month (Bar Chart)
      const monthlyOrders = await ordersCollection.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().getFullYear(), 0, 1), // Jan 1st this year
              $lte: new Date() // today
            }
          }
        },
        {
          $group: {
            _id: { $month: '$createdAt' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]).toArray()

      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1
        const found = monthlyOrders.find(m => m._id === month)
        return found ? found.count : 0
      })

      // Top 5 Selling Products
      const topProducts = await customerordersCollection.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productName',
            totalSold: { $sum: '$items.quantity' }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 }
      ]).toArray()

      res.json({
        success: true,
        data: {
          totalOrders,
          totalSales,
          monthlyData,
          topProducts
        }
      })
    } catch (error) {
      console.error('Dashboard data error:', error)
      res.status(500).json({ success: false, message: 'Internal server error' })
    }
  }
}

module.exports = DashboardController
