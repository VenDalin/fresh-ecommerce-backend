// const Product = require("../models/product");

// // Public endpoint to get products without authentication
// exports.getPublicProducts = async (req, res) => {
//   try {
//     // Basic filtering for public products (only show active products)
//     const queryConditions = { status: true };
    
//     // Handle search functionality if needed
//     const searchQuery = req.query.search || '';
//     if (searchQuery) {
//       queryConditions.name = { $regex: searchQuery, $options: 'i' };
//     }
    
//     // Handle category filtering if needed
//     const categoryId = req.query.category || '';
//     if (categoryId) {
//       queryConditions.categoryId = categoryId;
//     }
    
//     // Sort options
//     const sortField = req.query.sortField || 'createdAt';
//     const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
//     const sortOptions = { [sortField]: sortOrder };
    
//     // Optional limit
//     const limit = parseInt(req.query.limit) || 0;
    
//     // Fetch products with filtering
//     let query = Product.find(queryConditions).sort(sortOptions);
    
//     // Apply limit if specified
//     if (limit > 0) {
//       query = query.limit(limit);
//     }
    
//     // Populate category information if requested
//     if (req.query.populateCategory === 'true') {
//       query = query.populate('categoryId', 'name');
//     }
    
//     const products = await query;
    
//     return res.status(200).json({
//       success: true,
//       message: "Products retrieved successfully",
//       data: products,
//     });
//   } catch (error) {
//     console.error('Error in public products API:', error);
//     return res.status(500).json({
//       success: false,
//       message: `Error retrieving products: ${error.message}`
//     });
//   }
// };