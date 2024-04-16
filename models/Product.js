const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  description: { type: String, required: true },
  basicAmount: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  ownerName: { type: String, required: true }
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
