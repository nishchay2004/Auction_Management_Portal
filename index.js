const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authenticateToken = require("./middleware/authenticateToken");
const Product = require("./models/Product");
const DeletedProduct = require("./models/DeletedProduct");
const Bidder = require("./models/Bidder");
const SoldOutProduct = require("./models/SoldOutProduct");
const cron = require("node-cron");
const User = require("./models/User");

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


app.get("/", (req, res) => {
  res.redirect('/home.html');
});


// Registration endpoint
app.post("/register", async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.redirect('/register.html?loginError=1,UserAlreadyExists');
      // return res.status(400).json({ message: "User already exists" });
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
      // return res.status(401).json({ message: "Invalid password" });
      return res.redirect('/login.html?loginError=1,InvalidPassword');
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    if (email === 'admin@gmail.com' && password === 'admin@123') {
      res.redirect('/admin_page.html?token=' + token);
    } else {
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
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    // const refererUrl = new URL(req.headers.referer);
    // const token = refererUrl.searchParams.get('token');
    // Extract product details from request body
    const { itemName, description, basicAmount, startDate, endDate, ownerName } = req.body;


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
    let redirectUrl = '/base.html?token=' + token;
    if (ownerName === 'Admin') {
      redirectUrl = '/admin_page.html?token=' + token;
    }

    // Send JSON response with redirect URL
    res.status(201).json({ message: "Product added successfully", redirectUrl: redirectUrl });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ message: "Failed to add product" });
  }
});



// Fetch all products endpoint
app.get("/products", async (req, res) => {
  try {
    const currentDate = new Date();
    // Fetch all products from the database
    const products = await Product.find({ endDate: { $gte: currentDate } }, { ownerName: 1, itemName: 1, description: 1, basicAmount: 1, startDate: 1, endDate: 1, _id: 0 });
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



app.delete("/deleteProduct", authenticateToken, async (req, res) => {
  try {
    const ownerName = req.body.ownerName.trim(); // Trim leading and trailing whitespace
    const itemName = req.body.itemName.trim(); // Trim leading and trailing whitespace

    // Verify if the authenticated user is admin
    const authenticatedUser = req.user; // User information attached by authenticateToken middleware
    const adminUser = await User.findById(authenticatedUser.userId);
    if (!adminUser || adminUser.email !== 'admin@gmail.com') {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // Find the product to delete
    const productToDelete = await Product.findOne({ ownerName, itemName });

    if (!productToDelete) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Create a new DeletedProduct object with the data of the deleted product
    const deletedProduct = new DeletedProduct(productToDelete.toObject());

    // Save the deleted product to the DeletedProduct collection
    await deletedProduct.save();

    // Delete the product from the Product collection
    await Product.deleteOne({ ownerName, itemName: itemName });

    let redirectUrl = '/admin_page.html';
    // Send JSON response with redirect URL
    res.status(200).json({ message: "Product deleted successfully", redirectUrl: redirectUrl });

    // res.status(200).json({ message: "Product deleted successfully", deletedProduct });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Failed to delete product" });
  }
});



// Define a new route to get all deleted products
app.get("/getDeletedProducts", authenticateToken, async (req, res) => {

  try {
    // Fetch all deleted products from the DeletedProduct collection
    const deletedProducts = await DeletedProduct.find();

    // Send the deleted products as JSON response
    res.status(200).json(deletedProducts);
  } catch (error) {
    console.error("Error fetching deleted products:", error);
    res.status(500).json({ message: "Failed to fetch deleted products" });
  }
});


app.post("/bid", authenticateToken, async (req, res) => {
  try {
    const { itemName, ownerName, bidAmount } = req.body;
    const biduser = await User.findById(req.user.userId);
    const bidder = biduser.username;

    // Check if all required fields are provided
    if (!itemName || !ownerName || !bidAmount) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find the product by itemName and ownerName
    const product = await Product.findOne({ itemName, ownerName });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if bid amount is greater than current basic amount
    if (bidAmount > product.basicAmount) {
      // Update basic amount with the new bid
      product.basicAmount = bidAmount;
      await product.save();

      // Delete previous lower bids for the same ownerName and itemName
      await Bidder.deleteMany({ itemName, ownerName, bidAmount: { $lt: bidAmount } });


      // Save the bid details
      const newBid = new Bidder({
        itemName,
        ownerName,
        bidAmount,
        bidder: bidder // Assuming userId is the username
      });
      await newBid.save();

      return res.status(200).json({ message: "Bid placed successfully" });
    } else {
      return res.status(400).json({ message: "Bid amount should be higher than current basic amount" });
    }
  } catch (error) {
    console.error("Error placing bid:", error);
    res.status(500).json({ message: "Failed to place bid" });
  }
});


async function moveSoldOutProducts() {
  try {
    const currentDate = new Date();
    // Find products whose end dates have passed
    const soldOutProducts = await Product.find({ endDate: { $lt: currentDate } });
    // Iterate over each sold out product
    for (const product of soldOutProducts) {
      // Find the corresponding bidder for the product
      const bidderInfo = await Bidder.findOne({ itemName: product.itemName, ownerName: product.ownerName });
      // Create a new sold out product object with bidder information
      const soldOutProduct = new SoldOutProduct({
        itemName: product.itemName,
        ownerName: product.ownerName,
        bidder: bidderInfo ? bidderInfo.bidder : "No Bidder Found",
        bidAmount: bidderInfo ? bidderInfo.bidAmount : 0
      });
      // Save the sold out product
      await soldOutProduct.save();
    }
    // Remove sold out products from Product collection
    await Product.deleteMany({ endDate: { $lt: currentDate } });
  } catch (error) {
    console.error("Error moving sold out products:", error);
  }
}

// Define a cron job to execute moveSoldOutProducts function every day at midnight
cron.schedule("0 0 * * *", async () => {
  console.log("Running cron job to move sold-out products...");
  await moveSoldOutProducts();
});



app.get('/soldOutProducts', authenticateToken, async (req, res) => {
  try {
    // Fetch all sold-out products from the SoldOutProduct collection
    const soldOutProducts = await SoldOutProduct.find();
    res.json(soldOutProducts);
  } catch (error) {
    console.error("Error fetching sold-out products:", error);
    res.status(500).json({ message: "Failed to fetch sold-out products" });
  }
});



// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}/`);
});