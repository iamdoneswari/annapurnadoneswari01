const mongoose = require('mongoose');

// Sub-schema for individual user ratings/reviews
const ratingSchema = new mongoose.Schema({
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewerName: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    review: { type: String, trim: true },
    ratedAt: { type: Date, default: Date.now }
});

// Main schema for food listings
const listingSchema = new mongoose.Schema({
    // Donor Information (links to the User model)
    donorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    donorName: { type: String, required: true },
    address: { type: String, required: true },

    // Food Details
    foodItem: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 }, // Servings
    hoursOld: { type: Number, required: true, min: 0 },
    veg: { type: String, enum: ['veg', 'non-veg'], required: true },
    ingredients: { type: String, required: true }, // Comma-separated list for AI input
    // --- ADD THIS LINE ---
    pickupTimeWindow: { type: String, default: 'ASAP' }, // Added field for pickup time
    // --- END ADD ---
    // Status
    // --- ADD THIS LINE ---
    shelfLifeHours: { type: Number, required: true, min: 1 }, // Added field for shelf life (in hours from now)
    // --- END ADD ---
    status: {
        type: String,
        enum: ['available', 'claimed', 'delivered'],
        default: 'available',
    },

    // AI/Nutritional Data (The Magic)
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

// Middleware to calculate average rating whenever a new rating is added
listingSchema.pre('save', function (next) {
    if (this.isModified('ratings') && this.ratings.length > 0) {
        const totalRating = this.ratings.reduce((sum, r) => sum + r.rating, 0);
        this.ratingAvg = (totalRating / this.ratings.length).toFixed(1);
    } else if (this.isModified('ratings') && this.ratings.length === 0) {
        this.ratingAvg = 0;
    }
    next();
});

module.exports = mongoose.model('Listing', listingSchema);
