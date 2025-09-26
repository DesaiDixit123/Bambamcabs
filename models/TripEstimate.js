const mongoose = require("mongoose");

const tripEstimateSchema = new mongoose.Schema(
  {
    from: { type: String, required: true },        // e.g. "Surat, Gujarat"
    to: { type: String, required: true },          // e.g. "Mumbai, Gujarat"

    from_lat: { type: Number },   // Bhuvan response માંથી
    from_lng: { type: Number },
    to_lat: { type: Number },
    to_lng: { type: Number },

    vehicle_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleType",         // vehicle type master table
      required: true
    },

    distance_km: { type: Number }, // km માં Bhuvan distance
    price: { type: Number },       // 👈 Bhuvan થી મળેલ price

    raw_response: { type: Object }, // આખું Bhuvan response JSON reference માટે

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("TripEstimate", tripEstimateSchema);
