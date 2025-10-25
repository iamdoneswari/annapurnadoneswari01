// --- PASTE THIS CODE INTO annapurna-backend/auth.js ---

const jwt = require('jsonwebtoken');
const User = require('./models/User'); // We need the User model to check if the user exists
require('dotenv').config(); // To get the JWT_SECRET from your .env file

const auth = async (req, res, next) => {
    try {
        // Get the token from the request header
        // It's usually sent as 'Bearer TOKEN_STRING'
        const token = req.header('Authorization').replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied.' });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user in the database using the ID from the token
        // We select '-password' to exclude the password hash from the user object
        const user = await User.findById(decoded._id).select('-password');

        if (!user) {
            throw new Error('User not found.');
        }

        // Attach the user object to the request
        // Now, any protected route can access 'req.user'
        req.user = user;

        // Move on to the next function (the actual API route handler)
        next();

    } catch (error) {
        console.error('Auth middleware error:', error.message);
        res.status(401).json({ message: 'Token is not valid. Authorization denied.' });
    }
};

module.exports = auth;
// --- END OF auth.js CODE ---