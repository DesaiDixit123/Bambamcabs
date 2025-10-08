const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "users", required: true },

    // Reference to travel details
    travelDetailsId: { type: Schema.Types.ObjectId, ref: "travelDetails", required: true },

    // Company & Payment Info
    company_name: { type: String },
    gst_no: { type: String },
    payment_mode: { type: String, enum: ["Online", "Cash"], default: "Online" },
    payment_status: { type: String, enum: ["Pending", "Completed", "Failed"], default: "Pending" },
    transaction_id: { type: String },

    // Additional Payment Fields
    is_gst: { type: Number, enum: [0, 1], default: 0 },       // 0 = no GST, 1 = GST applied
    payment_type: { type: Number, enum: [0, 1] },             // 0 or 1
    payment_id: { type: String },                              // Razorpay payment ID (optional)
    sub_total_payment: { type: Number },                      // optional
    total_payment: { type: Number },                           // optional
    razorpay_payment: { type: Object },                        // store full Razorpay payment object if needed
    booking_id: { type: String, unique: true },

    // System
    booking_status: { type: String, enum: ["Confirmed", "Cancelled"], default: "Confirmed" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Booking", bookingSchema);
