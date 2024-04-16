// const jwt = require("jsonwebtoken");

// // Middleware function to authenticate requests
// const authenticateToken = (req, res, next) => {
//   // Extract token from Authorization header
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];
//   console.log(token);
//   if (token == null) {
//     return res.sendStatus(401); // No token provided
//   }
  
//   // Verify JWT token
//   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) {
//       return res.sendStatus(403); // Invalid or expired token
//     }
//     req.user = user; // Attach user information to request object
//     next(); // Move to next middleware or route handler
//   });
// };

// module.exports = authenticateToken;

const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    // Extract token from Authorization header
    // Extract token from referer field
    const refererUrl = new URL(req.headers.referer);
    const token = refererUrl.searchParams.get('token');

    // Check if token is provided
    console.log(token);
    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    // Verify JWT token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid or expired token." });
        }
        // If token is valid, attach user information to request object
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;

