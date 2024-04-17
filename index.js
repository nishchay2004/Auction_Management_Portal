  const express = require("express");
  const bodyParser = require("body-parser");
  const mongoose = require("mongoose");
  const dotenv = require("dotenv");
  const bcrypt = require("bcryptjs");
  const jwt = require("jsonwebtoken");
  const authenticateToken = require("./middleware/authenticateToken");
  const Product = require("./models/Product");

  const app = express();
  dotenv.config();
  // Body parser middleware
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(express.static('./public'));

  // MongoDB Atlas connection
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log(err));

  // User model
  const User = mongoose.model("User", {
    username: String,
    email: String,
    phone: String,
    password: String
  });

  // Registration endpoint
  app.post("/register", async (req, res) => {
    try {
      const { username, email, password, phone } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = new User({ username, email, password: hashedPassword, phone });
      await newUser.save();

      // res.status(201).json({ message: "User registered successfully" });
      res.redirect('/login.html');
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid password" });
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      if(email==='admin@gmail.com' && password==='admin@123'){
        res.redirect('/admin_page.html?token=' + token);
      }else{
        res.redirect("/base.html?token=" + token);
      }

      // Send token in response
      // res.json({ token });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/add_product", authenticateToken, async (req, res) => {
    try {
      const refererUrl = new URL(req.headers.referer);
      const token = refererUrl.searchParams.get('token');
      // Extract product details from request body
      const { itemName, description, basicAmount, startDate, endDate, ownerName } = req.body;

      // console.log(req.body)

      // Check if all required fields are provided
      if (!itemName || !description || !basicAmount || !startDate || !endDate) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Convert start and end dates to JavaScript Date objects
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      // Check if start date is before end date
      if (parsedStartDate >= parsedEndDate) {
        return res.status(400).json({ message: "End date must be after start date" });
      }


      // Create new product
      const newProduct = new Product({
        itemName,
        description,
        basicAmount,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        ownerName: ownerName // Assign owner's username
      });

      // Save product to database
      await newProduct.save();

      // res.status(201).json({ message: "Product added successfully" });
      if(ownerName === 'Admin'){
        res.redirect('/admin_page.html?token=' + token);
      } else{
        res.redirect('/base.html?token=' + token);
      }
    } catch (error) {
      console.error("Error adding product:", error);
      res.status(500).json({ message: "Failed to add product" });
    }
  });

  // Fetch all products endpoint
  app.get("/products", async (req, res) => {
    try {
      // Fetch all products from the database
      const products = await Product.find({}, { ownerName: 1, itemName: 1, description: 1, basicAmount: 1, startDate: 1, endDate: 1, _id: 0 });
      // Format dates to YYYY-MM-DD format
      const formattedProducts = products.map(product => ({
        ...product._doc,
        startDate: formatDate(product.startDate),
        endDate: formatDate(product.endDate)
      }));
      // Return the products
      res.json(formattedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });
  // Function to format date to YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };





  // Start server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}/`);
  });