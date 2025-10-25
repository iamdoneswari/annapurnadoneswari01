// --- NEW annapurna-backend/models/Listing.js ---

const mongoose = require('mongoose');

// Sub-schema for individual user ratings/reviews
const ratingSchema = new mongoose.Schema({
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewerName: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    review: { type: String, trim: true },
    ratedAt: { type: Date, default: Date.now }
});

// --- NEW SUB-SCHEMA FOR ITEMS ---
// This defines the structure for the 'items' array
const itemSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unit: { type: String, default: 'servings' },
    ingredients: { type: String }
}, { _id: false }); // _id: false stops Mongoose from adding an _id to each item

// --- Main schema for food listings ---
const listingSchema = new mongoose.Schema({
    // Donor Information (links to the User model)
    donor: { // RENAMED from 'donorId' to match server.js
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    
    // --- NEW FOOD DETAILS ---
    // Replaced foodItem, quantity, ingredients, etc. with this 'items' array
    items: [itemSchema], 

    // --- FIXED ENUM ---
    veg: { 
        type: String, 
        enum: ['veg', 'non-veg', 'mixed'], // ADDED 'mixed'
        required: true 
    },
    
    pickupTimeWindow: { type: String, default: 'ASAP' },
    shelfLifeHours: { type: Number, required: true, min: 1 },
    expiresAt: { type: Date }, // Will be set by server
    
    // --- NEW FIELD ---
    notes: { type: String, trim: true }, // Added notes field

    // Location
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
            required: true
        },
        coordinates: {
            type: [Number], // [Longitude, Latitude]
            required: true
        }
    },

    // Status
    status: {
        type: String,
        enum: ['available', 'claimed', 'picked_up', 'delivered', 'cancelled'],
        default: 'available',
    },

    // AI/Nutritional Data
    nutritionalData: {
        calories: { type: Number, default: 0 },
        protein: { type: Number, default: 0 },
        fat: { type: Number, default: 0 },
    },

    // Rating and Review System
    ratings: [ratingSchema],
    ratingAvg: { type: Number, default: 0 },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

// Middleware to calculate average rating
listingSchema.pre('save', function (next) {
    if (this.isModified('ratings') && this.ratings.length > 0) {
        const totalRating = this.ratings.reduce((sum, r) => sum + r.rating, 0);
        this.ratingAvg = (totalRating / this.ratings.length).toFixed(1);
    } else if (this.isModified('ratings') && this.ratings.length === 0) {
        this.ratingAvg = 0;
    }
    next();
});

// Create a 2dsphere index for geospatial queries (finding things nearby)
listingSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Listing', listingSchema);