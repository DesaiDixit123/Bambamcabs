const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const travelDetailsSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "users", required: true },

    // Trip Information
    trip_type: {
        type: String,
        enum: ["Oneway", "Round Trip", "Local Rental Trip"],
        required: true
    },
    from: { type: String },
    to: { type: String },
    city: { type: String },

    routes: [
        {
            from: { type: String },
            to: { type: String },
            date: { type: Date },
            pickup_time: { type: String }
        }
    ],

    date: { type: Date },
    pickup_time: { type: String },

    // Vehicle Selection
    vehicleId: { type: Schema.Types.ObjectId, ref: "vehiclestypes", required: true },
    vehicleName: { type: String },
    exploreId: { type: Schema.Types.ObjectId, ref: "exploreCabs", required: true },
    // Travel Details
    pickup_address: { type: String, required: true },
    drop_address: { type: String },
    traveler_name: { type: String, required: true },
    traveler_email: { type: String, required: true },
    traveler_mobile: { type: String, required: true },

    // Offers & Services
    offers_id: { type: Schema.Types.ObjectId, ref: "offers" },
    special_services: [
        {
            type: Schema.Types.ObjectId,
            ref: "SpecialServices"
        }
    ],


    company_name: { type: String },
    gst_no: { type: String },
    payment_mode: { type: String, enum: ["Online", "Cash"], default: "Online" },
    payment_status: { type: String, enum: ["Pending", "Completed", "Failed"], default: "Pending" },
    transaction_id: { type: String },

    // NEW FIELDS
    is_gst: { type: Number, enum: [0, 1], default: 0 },           // 0 = no GST, 1 = GST applied
    payment_type: { type: Number, enum: [0, 1] },                  // 0 or 1
    payment_id: { type: String },                                   // Razorpay payment ID (optional)
    sub_total_payment: { type: Number },                            // optional
    total_payment: { type: Number },                                // optional
    razorpay_payment: { type: Object },                             // store full Razorpay payment object if needed
    booking_id: { type: String, unique: true },

    // System
    booking_status: { type: String, enum: ["Confirmed", "Cancelled"], default: "Confirmed" },
       actual_distance_km: { type: Number, default: 0 },
    total_service_price: { type: Number, default: 0 },
    offer_discount: { type: Number, default: 0 },
    final_price: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("travelDetails", travelDetailsSchema);
