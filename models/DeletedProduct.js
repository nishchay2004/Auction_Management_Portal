const mongoose = require("mongoose");

const deletedProductSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  description: { type: String, required: true },
  basicAmount: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  ownerName: { type: String, required: true }
});

const DeletedProduct = mongoose.model("DeletedProduct", deletedProductSchema);

module.exports = DeletedProduct;
