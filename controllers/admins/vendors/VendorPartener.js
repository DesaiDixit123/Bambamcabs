const mongoConnection = require("../../../utilities/connections");
const responseManager = require("../../../utilities/response.manager");
const constants = require("../../../utilities/constants");
const vendorPartenerModel = require("../../../models/vendorPartener.model");

// 1. Register Vendor Partner
exports.registerVendorPartner = async (req, res) => {
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    let { country, countryCode, state, stateCode, city, cityCode, numberOfCars, email, whatsappNumber } = req.body;

    // ===== Input Validation =====
    if (!country || !countryCode || !state || !city || !numberOfCars || !email || !whatsappNumber) {
      return responseManager.badrequest({ message: "All fields are required" }, res);
    }

    // ===== Ensure + in countryCode =====
    if (!countryCode.startsWith("+")) {
      countryCode = "+" + countryCode;
    }

    // ===== Existing Check =====
    let existing = await vendorPartenerModel.findOne({
      $or: [{ email }, { whatsappNumber }],
    });
    if (existing) {
      return responseManager.badrequest({ message: "Email or Whatsapp number already registered" }, res);
    }

    // ===== Generate OTP =====
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpiry = new Date(Date.now() + 1 * 60 * 1000); // 🔥 1 min expiry

    // ===== Save Vendor =====
    let obj = {
      country,
      countryCode,
      state,
      stateCode,
      city,
      cityCode,
      numberOfCars,
      email,
      whatsappNumber,
      otp,
      otpExpiry,
      isVerified: false,
      createdAtTimestamp: Date.now(),
      updatedAtTimestamp: Date.now(),
    };

    let newVendor = await vendorPartenerModel.create(obj);

    // ===== Prepare response =====
    let responseData = {
      ...newVendor.toObject(),
      fullPhoneNumber: countryCode + whatsappNumber,
      otp: otp // ⚠️ Production માં remove કરજો
    };

    return responseManager.onSuccess("OTP sent successfully", responseData, res);

  } catch (err) {
    return responseManager.onError(err, res);
  }
};



// 2. Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { whatsappNumber, otp } = req.body;

    // Validation
    if (!whatsappNumber || !otp) {
      return responseManager.badrequest({ message: "Whatsapp number and OTP are required" }, res);
    }

    // Find vendor
    const vendor = await vendorPartenerModel.findOne({ whatsappNumber });
    if (!vendor) {
      return responseManager.badrequest({ message: "Vendor not found" }, res);
    }

    // Check OTP match
    if (vendor.otp !== otp) {
      return responseManager.badrequest({ message: "Invalid OTP" }, res);
    }

    // Check expiry
    if (vendor.otpExpiry < new Date()) {
      return responseManager.badrequest({ message: "OTP expired" }, res);
    }

    // Update verification
    vendor.isVerified = true;
    vendor.otp = null;
    vendor.otpExpiry = null;
    vendor.updatedAtTimestamp = Date.now();
    await vendor.save();

    // ✅ Return full vendor details
    return responseManager.onSuccess(
      "OTP verified successfully!",
      {
        ...vendor.toObject(),  // બધા fields MongoDB માંથી
        fullPhoneNumber: vendor.countryCode + vendor.whatsappNumber,
      },
      res
    );

  } catch (err) {
    return responseManager.onError(err, res);
  }
};




// 2. Resend OTP
exports.resendOtp = async (req, res) => {
  try {
    let { whatsappNumber } = req.body;

    if (!whatsappNumber) {
      return responseManager.badrequest({ message: "Whatsapp number is required" }, res);
    }


    let vendor = await vendorPartenerModel.findOne({ whatsappNumber });
    if (!vendor) {
      return responseManager.badrequest({ message: "Vendor not found" }, res);
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpiry = new Date(Date.now() + 1 * 60 * 1000); // 🔥 1 min expiry

    vendor.otp = otp;
    vendor.otpExpiry = otpExpiry;
    vendor.updatedAtTimestamp = Date.now();

    await vendor.save();

    let responseData = {
      fullPhoneNumber:  vendor.whatsappNumber,
      otp: otp
    };

    return responseManager.onSuccess("New OTP sent successfully", responseData, res);

  } catch (err) {
    return responseManager.onError(err, res);
  }
};
