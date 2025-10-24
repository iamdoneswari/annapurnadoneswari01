const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
require('dotenv').config(); // Load environment variables from .env

// --- Mongoose Model Imports ---
// Make sure these paths are correct relative to server.js
const User = require('./models/User');
const Listing = require('./models/Listing');
const Order = require('./models/Order');

// --- Initialization ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(bodyParser.json()); // Parse incoming JSON requests

// --- Database Connection (MongoDB Atlas) ---
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Atlas connected successfully!'))
    .catch(err => {
        console.error('MongoDB connection error:', err.message);
        // Exit process with failure if DB connection fails
        process.exit(1);
    });

// --- Helper Functions (AI Simulation & Monetization) ---

/**
 * Simulates nutritional data based on a list of ingredients.
 * In a real app, this would be an external AI/ML service call.
 * @param {string} ingredientsString - Comma-separated list of ingredients.
 * @returns {object} Simulated nutritional data.
 */
const getNutritionEstimate = (ingredientsString) => {
    // Handle potential null or undefined input
    if (!ingredientsString) {
        return { calories: 0, protein: 0, fat: 0 };
    }

    const ingredients = ingredientsString.toLowerCase().split(',').map(s => s.trim());
    let calories = 0;
    let protein = 0;
    let fat = 0;

    // Simplified lookup and calculation
    ingredients.forEach(ing => {
        if (ing.includes('rice')) { calories += 150; protein += 3; }
        else if (ing.includes('chicken') || ing.includes('meat')) { calories += 200; protein += 30; fat += 8; }
        else if (ing.includes('dal') || ing.includes('beans') || ing.includes('potato')) { calories += 100; protein += 7; }
        else if (ing.includes('vegetables') || ing.includes('veg') || ing.includes('spices')) { calories += 50; protein += 3; }
        else if (ing.includes('oil') || ing.includes('ghee') || ing.includes('yogurt')) { calories += 80; fat += 10; }
    });

    // Add a randomized factor for a more "intelligent" feel
    const factor = 0.9 + Math.random() * 0.2; // +/- 10% variance

    return {
        calories: Math.round(calories * factor),
        protein: Math.round(protein * factor),
        fat: Math.round(fat * factor),
    };
};

/**
 * Simulates ride rate calculation. In a real app, this would use geometry/distance.
 * @returns {object} Calculated fee details.
 */
const calculateRideRate = () => {
    // Fixed simulated rates for hackathon MVP
    const TOTAL_FEE = 60; // Simulated base fee
    const COMMISSION_RATE = 0.20; // 20% commission for Annapurna

    const annapurnaCommission = Math.round(TOTAL_FEE * COMMISSION_RATE);
    const riderPayout = TOTAL_FEE - annapurnaCommission;

    return {
        totalFee: TOTAL_FEE,
        annapurnaCommission: annapurnaCommission,
        riderPayout: riderPayout,
    };
};


// --- API Endpoints ---
// --- ADD THIS ENTIRE BLOCK to server.js ---

// 11. Delete Listing (Donor - only if 'available')
app.delete('/api/listings/:listingId', async (req, res) => {
    try {
        const { listingId } = req.params;
        // You might add userId verification here in a real app
        // const { userId } = req.body; // Assuming you send userId

        const listing = await Listing.findById(listingId);

        if (!listing) {
            return res.status(404).json({ message: 'Listing not found.' });
        }

        // Optional: Check if the user trying to delete is the donor
        // if (listing.donorId.toString() !== userId) {
        //     return res.status(403).json({ message: 'Not authorized to delete this listing.' });
        // }

        // IMPORTANT: Only allow deletion if the status is 'available'
        if (listing.status !== 'available') {
            return res.status(400).json({ message: 'Cannot delete listing once it has been claimed.' });
        }

        await Listing.findByIdAndDelete(listingId);

        res.status(200).json({ message: 'Listing deleted successfully.' });

    } catch (error) {
        console.error('Delete listing error:', error);
        res.status(500).json({ message: 'Failed to delete listing.' });
    }
});
// --- END of DELETE /api/listings/:listingId ---

// 1. User Registration (Public)
// Creates a new user (Donor, Receiver, or Rider)
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, phone, address, role } = req.body;

    // Basic validation
    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user in the database
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            address,
            role,
        });

        // Send back user data (excluding password)
        res.status(201).json({
            _id: newUser._id,
            name: newUser.name,
            role: newUser.role,
            address: newUser.address,
            message: 'Registration successful!',
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// 2. User Login (Public)
// Authenticates a user and returns their data
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password.' });
    }

    try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid Credentials (User not found).' });
        }

        // Compare password with the hashed version
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid Credentials (Wrong password).' });
        }

        // Successful login: Send back user data
        res.status(200).json({
            _id: user._id,
            name: user.name,
            role: user.role,
            address: user.address,
            message: 'Login successful!',
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});


// 3. Create Listing (Donor)
// Allows a logged-in Donor to create a new food listing
app.post('/api/listings', async (req, res) => {
    try {
        const { donorId, donorName, foodItem, quantity, hoursOld, veg, ingredients, address, pickupTimeWindow, shelfLifeHours } = req.body;

        // --- AI Simulation Step ---
        // Calculate nutrition based on ingredients
        const nutritionalData = getNutritionEstimate(ingredients);

        // Create new listing in the database
        const newListing = await Listing.create({
            donorId,
            donorName,
            address,
            foodItem,
            quantity,
            hoursOld,
            veg,
            ingredients,
            // --- ADD 'pickupTimeWindow' HERE ---
            pickupTimeWindow, // Save the received pickup time
            // --- ADD 'shelfLifeHours' HERE ---
            shelfLifeHours, // How many more hours it's good f
            nutritionalData, // Saved the AI result
            status: 'available', // Default status
        });

        res.status(201).json(newListing);
    } catch (error) {
        console.error('Create listing error:', error);
        res.status(500).json({ message: 'Failed to create listing.' });
    }
});

// 4. Get All Listings (All Roles)
// Fetches all listings for the main dashboard
app.get('/api/listings', async (req, res) => {
    try {
        // Find all listings, ordered by newest first
        const listings = await Listing.find().sort({ createdAt: -1 });
        res.status(200).json(listings);
    } catch (error) {
        console.error('Get listings error:', error);
        res.status(500).json({ message: 'Failed to fetch listings.' });
    }
});


// 5. Claim Listing (Receiver)
// Allows a Receiver to claim an 'available' listing
app.post('/api/orders/claim', async (req, res) => {
    try {
        const { listingId, receiverId, receiverName, receiverAddress } = req.body;

        // Check if the listing is available
        const listing = await Listing.findById(listingId);
        if (!listing || listing.status !== 'available') {
            return res.status(400).json({ message: 'Listing is not available for claim.' });
        }

        // 1. Update Listing status to 'claimed'
        listing.status = 'claimed';
        await listing.save();

        // 2. Create Order (Awaiting Rider)
        // This new order links the listing and receiver
        const newOrder = await Order.create({
            listingId,
            receiverId,
            receiverName,
            receiverAddress,
            status: 'awaiting_rider', // Ready for a rider to accept
        });

        res.status(201).json(newOrder);
    } catch (error) {
        console.error('Claim listing error:', error);
        res.status(500).json({ message: 'Failed to claim listing.' });
    }
});


// 6. Rider Accepts Order (Rider)
// Allows a Rider to accept an 'awaiting_rider' order
app.put('/api/orders/:orderId/accept', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { riderId, riderName } = req.body;

        // --- Monetization Step ---
        // Calculate fees for the order
        const rates = calculateRideRate();

        // Find and update the order with rider info and fees
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            {
                riderId,
                riderName,
                status: 'picked_up', // Rider is now en route
                totalFee: rates.totalFee,
                annapurnaCommission: rates.annapurnaCommission,
                riderPayout: rates.riderPayout,
                pickedUpAt: Date.now(),
            },
            { new: true } // Return the updated document
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        res.status(200).json(updatedOrder);
    } catch (error) {
        console.error('Rider accept error:', error);
        res.status(500).json({ message: 'Failed to accept order.' });
    }
});


// 7. Update Order Status to Delivered (Rider)
// Allows the Rider to mark the order as complete
app.put('/api/orders/:orderId/deliver', async (req, res) => {
    try {
        const { orderId } = req.params;

        // Find and update the order status
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status: 'delivered', deliveredAt: Date.now() },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        // Also update the original listing status to 'delivered'
        await Listing.findByIdAndUpdate(updatedOrder.listingId, { status: 'delivered' });

        res.status(200).json(updatedOrder);
    } catch (error) {
        console.error('Delivery update error:', error);
        res.status(500).json({ message: 'Failed to update delivery status.' });
    }
});


// 8. Submit Rating/Review (Receiver)
// Allows the Receiver to rate the food listing after delivery
app.post('/api/listings/:listingId/rate', async (req, res) => {
    try {
        const { listingId } = req.params;
        const { reviewerId, reviewerName, rating, review } = req.body;

        const listing = await Listing.findById(listingId);
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found.' });
        }

        // Check if user already rated this listing (good practice)
        const hasRated = listing.ratings.some(r => r.reviewerId.toString() === reviewerId);
        if (hasRated) {
            return res.status(400).json({ message: 'You have already rated this listing.' });
        }

        // Add the new rating to the listing's ratings array
        listing.ratings.push({ reviewerId, reviewerName, rating, review });

        // Mongoose pre-save middleware (in Listing.js) 
        // will automatically calculate the new ratingAvg here!
        await listing.save();

        res.status(200).json({ message: 'Rating submitted successfully!', ratingAvg: listing.ratingAvg });

    } catch (error) {
        console.error('Rating submission error:', error);
        res.status(500).json({ message: 'Failed to submit rating.' });
    }
});

// 9. Get User-Specific Orders (All Roles)
// Fetches orders relevant to a specific user (as Receiver or Rider)
app.get('/api/orders/user/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // Fetch orders where the user is either the receiver or the rider
        const orders = await Order.find({
            $or: [{ receiverId: userId }, { riderId: userId }]
        })
            .populate('listingId') // Include details from the Listing model
            .sort({ claimedAt: -1 }); // Show newest first

        res.status(200).json(orders);
    } catch (error) {
        console.error('Get user orders error:', error);
        res.status(500).json({ message: 'Failed to fetch user orders.' });
    }
});

// 10. Get Orders Awaiting Rider (Rider Dashboard)
// Fetches all orders that are waiting for a rider to accept
app.get('/api/orders/awaiting-rider', async (req, res) => {
    try {
        const orders = await Order.find({ status: 'awaiting_rider' })
            .populate('listingId') // Include listing details
            .sort({ claimedAt: 1 }); // Show oldest first (first-come, first-serve)

        res.status(200).json(orders);
    } catch (error) {
        console.error('Get awaiting orders error:', error);
        res.status(500).json({ message: 'Failed to fetch awaiting orders.' });
    }
});

// --- CHECK FOR THIS CODE BLOCK in server.js ---

// 11. Delete Listing (Donor - only if 'available')
app.delete('/api/listings/:listingId', async (req, res) => { // <<< Make sure this path is EXACTLY '/api/listings/:listingId'
    try {
        const { listingId } = req.params;

        const listing = await Listing.findById(listingId);

        if (!listing) {
            return res.status(404).json({ message: 'Listing not found.' });
        }

        // IMPORTANT: Only allow deletion if the status is 'available'
        if (listing.status !== 'available') {
            return res.status(400).json({ message: 'Cannot delete listing once it has been claimed.' });
        }

        await Listing.findByIdAndDelete(listingId);

        res.status(200).json({ message: 'Listing deleted successfully.' });

    } catch (error) {
        console.error('Delete listing error:', error);
        res.status(500).json({ message: 'Failed to delete listing.' });
    }
});
// --- END of DELETE /api/listings/:listingId ---
// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Annapurna MERN Backend running on http://localhost:${PORT}`);
});

