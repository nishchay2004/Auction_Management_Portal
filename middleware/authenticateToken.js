const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    // Extract the token from the Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Check if the token is provided
    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    // Verify the JWT token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid or expired token." });
        }
        // If the token is valid, attach user information to the request object
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;
