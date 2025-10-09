const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const exploreCabsSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "users", required: true },

  trip_type: {
    type: String,
    enum: ["Oneway", "Round Trip", "Local Rental Trip"],
    required: true,
  },
  from: { type: String },
  to: { type: [String], default: [] },

  city: { type: String },

  pickup_date: { type: Date, required: true },
  pickup_time: { type: String, required: true },
  fix_price_per_day: { type: Number, default: 0 },
  // 🔹 Matched Trip Info (for record)
  tripId: { type: Schema.Types.ObjectId, ref: "trips" },
  totalKm: { type: Number },
  duration: { type: String },
  return_date: { type: String },
  selected_vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "vehicles" },
  vehicleIds: [{ type: Schema.Types.ObjectId, ref: "vehicles" }], // ✅ Added this
  // 🔹 Status flags
  is_result_found: { type: Boolean, default: false },
  upto_km: { type: Number },
  final_price: { type: Number, default: 0 },
  per_km_price: Number,    // ✅ new
  per_hour_price: Number,  // ✅ new
  // System
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("exploreCabs", exploreCabsSchema);
