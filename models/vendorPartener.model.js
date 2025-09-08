const mongoose = require("mongoose");

const vendorPartnerSchema = new mongoose.Schema({
  country: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  numberOfCars: {
    type: Number,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  whatsappNumber: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: false
  },
  fcm_token: {
    type: String,
    required: false
  },
  otp: {
    type: String,
    required: false
  },
  otpExpiry: {
    type: Date,
    required: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
   // or "Admin" model if you have
    required: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
   // or "Admin"
    required: false
  }
}, { timestamps: true });

module.exports = mongoose.model("VendorPartner", vendorPartnerSchema);
