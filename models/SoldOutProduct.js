const mongoose = require("mongoose");

const soldOutProductSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  ownerName: { type: String, required: true },
  bidder: { type: String, required: true },
  bidAmount: { type: Number, required: true }
});

const SoldOutProduct = mongoose.model("SoldOutProduct", soldOutProductSchema);

module.exports = SoldOutProduct;
