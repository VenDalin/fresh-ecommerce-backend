const mongoose = require("mongoose");
const { getIo } = require("../socket");
const { getNextId } = require("../utils/getNextId");
const bcrypt = require("bcrypt");

// 🔐 Local helper
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// ✅ All registered models
const modelMap = {
  User: require("../models/user"),
  Cart: require("../models/cartItems"),
  Category: require("../models/category"),
  CustomerOrder: require("../models/customerOrder"),
  Discount: require("../models/discounts"),
  Promotion: require("../models/promotion"), // Promotion uses discounts model
  Favorite: require("../models/favorite"),
  Order: require("../models/order"),
  Product: require("../models/product"),
  PurchaseHistory: require("../models/purchaseHistory"),
  PurchaseProduct: require("../models/purchaseProduct"),
  Rating: require("../models/rating"),
  Supplier: require("../models/supplier"),
  System: require("../models/system"),
  Stock: require("../models/stock"),
  Transaction: require("../models/transactions"),
  UserLog: require("../models/userLog"),
  Rate: require("../models/rating"),
  DeletePurchaseLog: require("../models/deletedPurchaseProductLog"),
  Symbol: require("../models/symbol"),
  SymbolCurrency: require("../models/symbol"), // <-- Add this line
  Currency: require("../models/currency"),
  CustomerFeedback: require("../models/customerFeedback"), // <-- Add this line
};

function hasUserPermission(req, action, roleType) {
  const permission = `${action}_${roleType}`;
  return (
    req.user.role === "superadmin" ||
    (req.user.role === "admin" && req.user.permissions?.includes(permission))
  );
}

function hasModelPermission(req, action, model) {
  const permission = `${action}_${model}`;
  return (
    req.user.role === "superadmin" ||
    req.user.role === "admin" ||
    (req.user.permissions && req.user.permissions.includes(permission))
  );
}

exports.getNextDocId = async (req, res) => {
  try {
    const { collectionName, branchId } = req.params;
    if (!branchId)
      return res
        .status(400)
        .json({ success: false, message: "branchId is required" });

    const nextId = await getNextId(branchId, collectionName);
    res.status(200).json({ success: true, nextId });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
};

exports.insertDoc = async (req, res) => {
  try {
    const { collectionName } = req.params;
    const docData = req.body.fields;

    console.log("📥 insertDoc called");
    console.log("📁 Target collection:", collectionName);
    console.log("📄 Document data:", docData);
    console.log("👤 Current user:", req.user);

    const model = modelMap[collectionName];
    if (!model) {
      console.log(" Model not found");
      return res.status(404).json({ message: "Model not found" });
    }

    // Favorite by customer
    if (collectionName === "Favorite" && req.user.role === "customer") {
      docData.userId = req.user._id;
      docData.createdBy = req.user._id;
      const exists = await model.findOne({
        userId: req.user._id,
        productId: docData.productId,
      });
      if (exists)
        return res
          .status(400)
          .json({ success: false, message: "Product already in favorites" });
    }

    // Add to cart by customer
    if (collectionName === "Cart" && req.user.role === "customer") {
      docData.userId = req.user._id;
      docData.createdBy = req.user._id;
      const existingCart = await model.findOne({
        userId: req.user._id,
        productId: docData.productId,
      });
      if (existingCart) {
        existingCart.quantity += docData.quantity || 1;
        const updated = await existingCart.save();
        return res.status(200).json({
          success: true,
          message: "Cart item quantity increased",
          data: updated,
        });
      }
    }

    // Customers creating Order/CustomerOrder
    if (
      (collectionName === "Order" || collectionName === "CustomerOrder") &&
      req.user.role === "customer"
    ) {
      docData.userId = req.user._id;
      docData.createdBy = req.user._id;
    }

    // Default customer user permissions
    if (collectionName === "User") {
      if (!docData.role || docData.role === "customer") {
        docData.role = "customer";
        docData.permissions = [
          "create_favorite",
          "delete_favorite",
          "read_favorite",
          "update_stock",  // Add stock update permission for customers
          "update_product"
        ];
        console.log(" Default permissions assigned to customer user");
      }
    }

    // Only admin/superadmin can create Currency or SymbolCurrency
    if (["Currency", "SymbolCurrency"].includes(collectionName)) {
      if (req.user.role !== "admin" && req.user.role !== "superadmin") {
        return res
          .status(403)
          .json({
            message: `Permission denied: create_${collectionName.toLowerCase()}`,
          });
      }
    }

    // Check permissions for protected models (except customers creating Favorite/Order/CustomerOrder)
    if (
      [
        "Category",
        "Product",
        "Discount",
        "Promotion",
        "Supplier",
        "Stock",
        "Order",
        "CustomerOrder",
        "Transaction",
        "Favorite",
        "DeletePurchaseLog",
      ].includes(collectionName)
    ) {
      if (
        !(
          (collectionName === "Favorite" && req.user.role === "customer") ||
          (collectionName === "Order" && req.user.role === "customer") ||
          (collectionName === "CustomerOrder" && req.user.role === "customer")
        )
      ) {
        const allowed = hasModelPermission(
          req,
          "create",
          collectionName.toLowerCase()
        );
        console.log("🔐 Permission check:", allowed ? "Allowed" : "Denied");
        if (!allowed) {
          return res
            .status(403)
            .json({
              message: `Permission denied: create_${collectionName.toLowerCase()}`,
            });
        }
      }
    }

    // Save to database
    const newDoc = new model(docData);
    const saved = await newDoc.save();

    console.log("✅ Document saved:", saved);

    getIo().emit("dataUpdate", {
      action: "insert",
      collection: collectionName,
      data: saved._id,
    });
    console.log("📡 WebSocket emitted:", {
      action: "insert",
      collection: collectionName,
      data: saved._id,
    });

    if (collectionName === "Order") {
      getIo().emit("orderCreated", saved);
      console.log("📡 WebSocket emitted: orderCreated event");
    }
    if (collectionName === "CustomerOrder") {
      getIo().emit("customerOrderCreated", saved);
      console.log("📡 WebSocket emitted: customerOrderCreated event");
    }
    if (collectionName === "Product") {
      getIo().emit("productCreated", saved);
      console.log("📡 WebSocket emitted: productCreated event");
    }
    if (collectionName === "Promotion") {
      getIo().emit("promotionCreated", saved);
      console.log("📡 WebSocket emitted: promotionCreated event");
    }


    res.status(200).json({
      success: true,
      message: `${collectionName} inserted`,
      data: saved,
    });
  } catch (err) {
    console.error(" Insert error:", err.message);
    res
      .status(500)
      .json({ success: false, message: `Insert error: ${err.message}` });
  }
};
exports.updateDoc = async (req, res) => {
  try {
    const { collectionName, id } = req.params;
    const updateData = req.body.fields;

    console.log("📥 updateDoc called");
    console.log("📁 Target collection:", collectionName);
    console.log("📝 Update data:", updateData);
    console.log("👤 Current user:", req.user);

    const model = modelMap[collectionName];
    if (!model) return res.status(404).json({ message: "Model not found" });

    if (collectionName === "User") {
      const user = await model.findById(id);
      if (!user) return res.status(404).json({ message: "User not found" });
      // Special case: allow customers to update their own user document
      if (req.user.role === "customer" && user._id.toString() === req.user._id.toString()) {
        if (updateData.password) {
          updateData.password = await hashPassword(updateData.password);
        }
        const updated = await model.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        return res.status(200).json({ message: `User updated`, data: updated });
      }
      const allowed = hasUserPermission(req, "update", user.role);
      if (!allowed)
        return res
          .status(403)
          .json({ message: `Permission denied: update_${user.role}` });

      if (updateData.password) {
        updateData.password = await hashPassword(updateData.password);
      }
    }

    if (collectionName === "Order" && req.user.role === "customer") {
      const order = await model.findById(id);
      if (!order) return res.status(404).json({ message: "Order not found" });

      if (!order.userId.equals(req.user._id)) {
        return res
          .status(403)
          .json({ message: "Permission denied: not your order" });
      }

      if (updateData.status && updateData.status === "got_product") {
        updateData.gotProductAt = new Date();
        const updated = await model.findByIdAndUpdate(id, updateData, {
          new: true,
          runValidators: true,
        });
        if (!updated)
          return res.status(404).json({ message: "Order not found" });

        console.log("✅ Customer updated order to got_product:", updated);

        getIo().emit("dataUpdate", {
          action: "update",
          collection: collectionName,
          data: updated._id,
        });
        getIo().emit("orderUpdated", updated);

        return res
          .status(200)
          .json({ message: "Order updated to got_product", data: updated });
      }

      return res
        .status(403)
        .json({
          message:
            "Permission denied: customers can only update status to got_product",
        });
    }

    if (
      collectionName === "Product" &&
      req.user.role === "customer" &&
      updateData.totalStock !== undefined &&
      Object.keys(updateData).length <= 3
    ) {
      console.log("🛒 Customer updating product stock during checkout");
      const updated = await model.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });
      if (!updated)
        return res.status(404).json({ message: `${collectionName} not found` });

      getIo().emit("dataUpdate", {
        action: "update",
        collection: collectionName,
        data: updated._id,
      });
      return res
        .status(200)
        .json({ message: `${collectionName} updated`, data: updated });
    }

    if (
      [
        "Category",
        "Product",
        "Discount",
        "Supplier",
        "Stock",
        "Order",
        "CustomerOrder",
        "Transaction",
        "Favorite",
      ].includes(collectionName)
    ) {
      const allowed = hasModelPermission(
        req,
        "update",
        collectionName.toLowerCase()
      );
      console.log("🔐 Permission check:", allowed ? "Allowed" : "Denied");
      if (!allowed)
        return res
          .status(403)
          .json({
            message: `Permission denied: update_${collectionName.toLowerCase()}`,
          });
    }

    if (collectionName === "Order" && updateData.status) {
      switch (updateData.status) {
        case "confirmed":
          updateData.confirmedAt = new Date();
          break;
        case "delivering":
          updateData.deliveringAt = new Date();
          break;
        case "got_product":
          updateData.gotProductAt = new Date();
          break;
      }
    }

    const updated = await model.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!updated)
      return res.status(404).json({ message: `${collectionName} not found` });

    console.log("✅ Document updated:", updated);

    getIo().emit("dataUpdate", {
      action: "update",
      collection: collectionName,
      data: updated._id,
    });

    if (collectionName === "Order") {
      getIo().emit("orderUpdated", updated);
      console.log("📡 WebSocket emitted: orderUpdated event");
    }
    if (collectionName === "CustomerOrder") {
      getIo().emit("customerOrderUpdated", updated);
      console.log("📡 WebSocket emitted: customerOrderUpdated event");
    }
    if (collectionName === "Product") {
      getIo().emit("productUpdated", updated);
      console.log("📡 WebSocket emitted: productUpdated event");
    }
    if (collectionName === "Promotion") {
      getIo().emit("promotionUpdated", updated);
      console.log("📡 WebSocket emitted: promotionUpdated event");
    }


    return res
      .status(200)
      .json({ message: `${collectionName} updated`, data: updated });
  } catch (err) {
    console.error("❌ Update error:", err.message);
    res.status(500).json({ message: `Update error: ${err.message}` });
  }
};

exports.deleteDoc = async (req, res) => {
  try {
    const { collectionName, id } = req.params;
    console.log("📥 deleteDoc called");
    console.log("📁 Target collection:", collectionName);
    console.log("🗑️ Document ID:", id);
    console.log("👤 Current user:", req.user);

    const model = modelMap[collectionName];
    if (!model) return res.status(404).json({ message: "Model not found" });

    if (collectionName === "Favorite" && req.user.role === "customer") {
      const deleted = await model.findOneAndDelete({
        _id: id,
        userId: req.user._id,
      });
      if (!deleted)
        return res
          .status(404)
          .json({ success: false, message: "Favorite not found" });

      console.log("Favorite removed:", deleted);
      return res
        .status(200)
        .json({ success: true, message: "Favorite removed" });
    }

    const deleted = await model.findByIdAndDelete(id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Document not found" });

    console.log("Document deleted:", deleted);

    getIo().emit("dataUpdate", {
      action: "delete",
      collection: collectionName,
      data: id,
    });
    console.log(" WebSocket emitted:", {
      action: "delete",
      collection: collectionName,
      data: id,
    });

    if (collectionName === "Order") {
      getIo().emit("orderDeleted", id);
      console.log("📡 WebSocket emitted: orderDeleted event");
    }
    if (collectionName === "CustomerOrder") {
      getIo().emit("customerOrderDeleted", id);
      console.log("📡 WebSocket emitted: customerOrderDeleted event");
    }
    if (collectionName === "Product") {
      getIo().emit("productDeleted", id);
      console.log("📡 WebSocket emitted: productDeleted event");
    }
    if (collectionName === "Promotion") {
      getIo().emit("promotionDeleted", id);
      console.log("📡 WebSocket emitted: promotionDeleted event");
    }


    res
      .status(200)
      .json({ success: true, message: `${collectionName} deleted` });
  } catch (err) {
    console.error("Delete error:", err.message);
    res
      .status(500)
      .json({ success: false, message: `Delete error: ${err.message}` });
  }
};