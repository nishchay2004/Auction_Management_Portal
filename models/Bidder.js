const mongoose = require("mongoose");

const bidderSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  ownerName: { type: String, required: true },
  bidAmount: { type: Number, required: true },
  bidder: { type: String, required: true }
});

const Bidder = mongoose.model("Bidder", bidderSchema);

module.exports = Bidder;
