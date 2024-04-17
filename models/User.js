const mongoose = require("mongoose");
  
  // User model
  const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    phone: String,
    password: String
  });

const User = mongoose.model("User", userSchema);

module.exports = User;
