const mongoose = require('mongoose');

// Schema defines the structure of documents in a MongoDB collection
const userSchema = new mongoose.Schema({
    // Authentication Fields
    email: {
        type: String,
        required: true,
        unique: true, // Ensures no two users can register with the same email
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
        enum: ['donor', 'receiver', 'rider'], // Only allows these three roles
    },
    
    // Profile Fields
    name: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

// Export the model so it can be used in server.js
module.exports = mongoose.model('User', userSchema);
