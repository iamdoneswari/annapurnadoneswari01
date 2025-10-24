const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({ // Corrected: only one 'new'
    // Linking to the Listing and Receiver
    listingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiverName: { type: String, required: true },
    receiverAddress: { type: String, required: true },

    // Rider and Delivery Status
    riderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null, // Null until claimed by a rider
    },
    riderName: { type: String, default: null },
    status: {
        type: String,
        enum: ['awaiting_rider', 'picked_up', 'delivered'],
        default: 'awaiting_rider',
    },

    // Monetization/Commission Data
    totalFee: { type: Number, default: 60 }, // Simulated base fee for the ride (can be calculated later)
    annapurnaCommission: { type: Number, default: 12 }, // 20% commission (60 * 0.2)
    riderPayout: { type: Number, default: 48 }, // 80% payout

    // Timestamps
    claimedAt: { type: Date, default: Date.now },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
});

module.exports = mongoose.model('Order', orderSchema);
