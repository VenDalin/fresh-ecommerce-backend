const Product = require('../models/product');
const Stock = require('../models/stock');
const Category = require('../models/category');
const Supplier = require('../models/supplier');
const User = require('../models/user');
const Cart = require('../models/cartItems');
const CustomerOrder = require('../models/customerOrder');
const Discount = require('../models/discounts');
const Favorite = require('../models/favorite');
const Rate = require('../models/rating');
const Promotion = require('../models/promotion'); // Promotion model (assuming discounts.js is used)
const Order = require('../models/order');
const PurchaseHistory = require('../models/purchaseHistory');
const PurchaseProduct = require('../models/purchaseProduct');
const Rating = require('../models/rating');
const System = require('../models/system');
const Transaction = require('../models/transactions');
const UserLog = require('../models/userLog');
const DeletePurchaseLog = require('../models/deletedPurchaseProductLog');
const CustomerFeedback = require('../models/customerFeedback');
//Check Role
const checkRole = require('../middleware/checkRole');
const SymbolCurrency = require('../models/symbol')
const Currency = require('../models/currency')


// ✅ Reusable Model Map
const modelMap = {
  Product,
  Stock,
  Category,
  Supplier,
  User,
  Cart,
  CustomerOrder,
  Discount,
  Favorite,
  Rate,
  Order,
  PurchaseHistory,
  PurchaseProduct,
  Rating,
  System,
  Transaction,
  UserLog,
  DeletePurchaseLog,
  SymbolCurrency,
  Symbol: SymbolCurrency, // <-- Add this line
  Currency,
  CustomerFeedback, // <-- Add this line
  Promotion // <-- Add Promotion here
};

// ✅ Required permission map
const permissionMap = {
  User: "read_user",
  Category: "read_category",
  Product: "read_product",
  Discount: "read_discount",
  Supplier: "read_supplier",
  Stock: "read_stock",
  Order: "read_order",
  CustomerOrder: "read_customerOrder",
  Transaction: "read_transaction",
  Favorite: "read_favorite",
  CustomerFeedback: "read_customerFeedback", // <-- Add this line
  Promotion: "read_promotion" // <-- Add Promotion here, using discount permission,

};

// ✅ Helper: Date operator
const dateOp = (operator, value) => {
  const date = new Date(value);
  switch (operator) {
    case '&gt': return { $gt: date };
    case '&lt': return { $lt: date };
    case '&gte': return { $gte: date };
    case '&lte': return { $lte: date };
    default: return {};
  }
};

// ✅ Helper: Generic operator
const genericOp = (field, operator, value) => {
  switch (operator) {
    case '!=': return { [field]: { $ne: value } };
    case '&gt': return { [field]: { $gt: value } };
    case '&lt': return { [field]: { $lt: value } };
    case '&gte': return { [field]: { $gte: value } };
    case '&lte': return { [field]: { $lte: value } };
    case '==': return { [field]: value };
    case 'arrayContains': return { [field]: { $elemMatch: { $eq: value } } };
    case 'objectKey': return { [`${field}.${value.key}`]: value.value };
    case 'arrayObjectKey': return { [field]: { $elemMatch: { [value.key]: value.value } } };
    default:
      return Array.isArray(value)
        ? { [field]: { $in: value } }
        : { [field]: value };
  } 
};

exports.getAllDocs = async (req, res) => {
  try {
    console.log("📥 getAllDocs called");
    const collectionName = req.params.collectionName;
    const model = modelMap[collectionName];

    console.log("📁 Requested Collection:", collectionName);
    console.log("👤 Current User:", req.user);

    if (!model) {
      console.log("❌ Model not found");
      return res.status(400).json({ message: `Unknown collection: ${collectionName}` });
    }

    // ✅ Customer: get own favorites
    if (collectionName === "Favorite" && req.user.role === "customer") {
      console.log("🔒 Customer fetching own favorites");
      const results = await model.find({ userId: req.user._id }).populate("productId");
      console.log("✅ Favorite data retrieved:", results.length);
      return res.status(200).json({
        message: `${collectionName} documents retrieved successfully`,
        data: results,
        success: true
      });
    }

    // ✅ Customer: get own cart items
    if (collectionName === "Cart" && req.user.role === "customer") {
      console.log("🔒 Customer fetching own cart items");
      const results = await model.find({ userId: req.user._id });
      console.log("✅ Cart items retrieved:", results.length);
      return res.status(200).json({
        message: `${collectionName} documents retrieved successfully`,
        data: results,
        success: true
      });
    }

    // ✅ Customer: get own orders
    if (collectionName === "Order" && req.user.role === "customer") {
      console.log("🔒 Customer fetching own orders");
      const results = await model.find({ userId: req.user._id });
      console.log("✅ Order data retrieved:", results.length);
      return res.status(200).json({
        message: `${collectionName} documents retrieved successfully`,
        data: results,
        success: true
      });
    }

    // ✅ Customer: view public products
    if (collectionName === "Product" && req.user.role === "customer") {
      console.log("🔓 Customer fetching public products");
      const results = await model.find({});
      console.log("✅ Product data retrieved:", results.length);
      return res.status(200).json({
        message: `${collectionName} documents retrieved successfully`,
        data: results,
        success: true
      });
    }

    // 🔐 Permission Check
    const requiredPermission = permissionMap[collectionName];
    console.log("🔐 Required Permission:", requiredPermission);

    // Special case: allow customers to read their own user document
    if (collectionName === "User" && req.user.role === "customer") {
      // If dynamicConditions is set to _id == req.user._id, allow
      const conditions = req.query.dynamicConditions ? JSON.parse(req.query.dynamicConditions) : [];
      const isSelfQuery = conditions.some(
        c => c.field === "_id" && c.operator === "==" && c.value == req.user._id.toString()
      );
      if (isSelfQuery) {
        const results = await model.find({ _id: req.user._id });
        return res.status(200).json({
          message: `${collectionName} document retrieved successfully`,
          data: results,
          success: true
        });
      }
    }

    // Special case: allow all main roles to view Promotion
    if (collectionName === "Promotion" && ["superadmin", "admin", "staff", "customer"].includes(req.user.role)) {
      // No permission check, allow
    } else if (
      req.user.role !== "superadmin" &&
      requiredPermission &&
      (!req.user.permissions || !req.user.permissions.includes(requiredPermission))
    ) {
      console.log("❌ Permission denied:", requiredPermission);
      return res.status(403).json({ message: `Permission denied: ${requiredPermission}` });
    }

    // 🔍 Dynamic Filtering
    const queryConditions = {};
    const conditions = req.query.dynamicConditions ? JSON.parse(req.query.dynamicConditions) : [];
    console.log("📌 Dynamic Conditions:", conditions);

    for (const condition of conditions) {
      const { field, operator, value, orConditions, type = "" } = condition;

      if (orConditions && Array.isArray(orConditions)) {
        const orQueries = orConditions.map((orCond) => {
          const { field: orField, operator: orOp, value: orVal, orType = "" } = orCond;
          return orType === "Date"
            ? { [orField]: dateOp(orOp, orVal) }
            : genericOp(orField, orOp, orVal);
        });
        queryConditions.$or = [...(queryConditions.$or || []), ...orQueries];
        continue;
      }

      if (type === "Date") {
        queryConditions[field] = { ...(queryConditions[field] || {}), ...dateOp(operator, value) };
      } else {
        Object.assign(queryConditions, genericOp(field, operator, value));
      }
    }

    console.log("🧾 Final Query Conditions:", queryConditions);

    const results = await model.find(queryConditions);
    console.log(`✅ Found ${results.length} ${collectionName} record(s)`);

    return res.status(200).json({
      message: `${collectionName} documents retrieved successfully`,
      data: results,
      success: true
    });
  } catch (error) {
    console.error("❌ Error in getAllDocs:", error.message);
    return res.status(500).json({ message: `Error retrieving documents: ${error.message}` });
  }
};



// 📌 GET PAGINATED RESULTS
exports.getPagination = async (req, res) => {
  try {
    const collectionName = req.query.collectionName;
    const model = modelMap[collectionName];
    if (!model) return res.status(400).json({ message: `Unknown collection: ${collectionName}` });

    const requiredPermission = permissionMap[collectionName];
    const user = req.user;

    if (
      user.role !== "superadmin" &&
      requiredPermission &&
      (!user.permissions || !user.permissions.includes(requiredPermission))
    ) {
      return res.status(403).json({ message: `Permission denied: ${requiredPermission}` });
    }

    const queryConditions = {};
    const conditions = req.query.dynamicConditions ? JSON.parse(req.query.dynamicConditions) : [];

    for (const condition of conditions) {
      const { field, operator, value, orConditions, type = '' } = condition;

      if (orConditions && Array.isArray(orConditions)) {
        const orQueries = orConditions.map((orCond) => {
          const { field: orField, operator: orOp, value: orVal, orType } = orCond;
          return orType === 'Date'
            ? { [orField]: dateOp(orOp, orVal) }
            : genericOp(orField, orOp, orVal);
        });
        queryConditions.$or = [...(queryConditions.$or || []), ...orQueries];
        continue;
      }

      if (type === 'Date') {
        queryConditions[field] = { ...(queryConditions[field] || {}), ...dateOp(operator, value) };
      } else {
        Object.assign(queryConditions, genericOp(field, operator, value));
      }
    }

    const searchFields = req.query.searchFields ? req.query.searchFields.split(',') : [];
    const searchTerm = req.query.searchTerm || '';
    if (searchTerm && searchFields.length > 0) {
      queryConditions.$or = searchFields.map((f) => ({ [f]: { $regex: searchTerm, $options: 'i' } }));
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.pageSize) || 10;
    const skip = (page - 1) * limit;

    const sortField = req.query.sortField || '_id';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    const sortOptions = { [sortField]: sortOrder };

    const populate = req.query.populate ? JSON.parse(req.query.populate) : [];
    let query = model.find(queryConditions).sort(sortOptions).skip(skip).limit(limit);
    populate.forEach((pop) => query = query.populate(pop));

    const results = await query;
    const totalDocuments = await model.countDocuments(queryConditions);

    return res.status(200).json({
      message: `${collectionName} documents retrieved successfully`,
      data: results,
      pagination: {
        totalDocuments,
        totalPages: Math.ceil(totalDocuments / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error('Pagination error:', error);
    return res.status(500).json({ message: `Error retrieving documents: ${error.message}` });
  }
};

// 📌 GET BY MULTIPLE IDS
exports.getDocByMultipleId = async (req, res) => {
  try {
    const { collectionName, id, populateFields } = req.query;
    if (!collectionName || !id) return res.status(400).json({ error: "collectionName and id are required" });

    const model = modelMap[collectionName];
    if (!model) throw new Error(`Unknown collection: ${collectionName}`);

    const idsArray = Array.isArray(id) ? id : [id];
    const populateArray = populateFields ? populateFields.split(",") : [];

    let query = model.find({ _id: { $in: idsArray } });
    populateArray.forEach((field) => {
      query = query.populate(field.trim());
    });

    const docs = await query.exec();
    return res.status(200).json(docs);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


// 📌 GET PUBLIC PRODUCTS (no auth)
exports.getPublicProducts = async (req, res) => {
  try {
    const queryConditions = { status: true };

    if (req.query.search) {
      queryConditions.name = { $regex: req.query.search, $options: 'i' };
    }

    if (req.query.category) {
      queryConditions.categoryId = req.query.category;
    }

    const sortField = req.query.sortField || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sortOptions = { [sortField]: sortOrder };

    const limit = parseInt(req.query.limit) || 0;
    let query = Product.find(queryConditions).sort(sortOptions);

    if (limit > 0) query = query.limit(limit);
    if (req.query.populateCategory === 'true') {
      query = query.populate('categoryId', 'name');
    }

    const products = await query;
    return res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      data: products,
    });
  } catch (error) {
    console.error('Error in public products API:', error);
    return res.status(500).json({
      success: false,
      message: `Error retrieving products: ${error.message}`
    });
  }
};

// 📌 GET PUBLIC PROMOTIONS (no auth)
exports.getPublicPromotion = async (req, res) => {
  try {
    console.log("Getting public promotions");
    const queryConditions = {};
    
    // Filter by active status if requested
    if (req.query.isActive === 'true') {
      const currentDate = new Date();
      queryConditions.isActive = true;
      queryConditions.startDate = { $lte: currentDate };
      queryConditions.endDate = { $gte: currentDate };
    }
    
    // Set up sorting
    const sortField = req.query.sortField || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sortOptions = { [sortField]: sortOrder };
    
    // Set up limit
    const limit = parseInt(req.query.limit) || 0;
    let query = Promotion.find(queryConditions).sort(sortOptions);
    
    if (limit > 0) query = query.limit(limit);
    
    const promotions = await query;
    console.log(`Found ${promotions.length} public promotions`);
    
    return res.status(200).json({
      success: true,
      message: "Promotions retrieved successfully",
      data: promotions,
    });
  } catch (error) {
    console.error('Error in public promotions API:', error);
    return res.status(500).json({
      success: false,
      message: `Error retrieving promotions: ${error.message}`
    });
  }
};
