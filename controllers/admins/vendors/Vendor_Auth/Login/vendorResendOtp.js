const responseManager = require("../../../../../utilities/response.manager");
const helper = require("../../../../../utilities/helper");
const vendorModel = require("../../../../../models/vendors.model");
const bcrypt = require("bcryptjs");
const mongoConnection = require("../../../../../utilities/connections");
const constants = require("../../../../../utilities/constants");
const nodemailer = require("nodemailer");



exports.vendorResendOtp = async (req, res) => {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { vendorId } = req.body;

    if (!vendorId) {
        return responseManager.badrequest(
            { message: "VendorId is required...!" },
            res
        );
    }

    // ✅ Vendor check
    let vendorData = await vendorModel.findById(vendorId).lean();
    if (!vendorData) {
        return responseManager.badrequest(
            { message: "Vendor not found. Please register first...!" },
            res
        );
    }

    if (vendorData.approval_status !== "approved") {
        return responseManager.badrequest(
            { message: "Your account is not approved yet. Please contact admin...!" },
            res
        );
    }

    // ✅ Generate new OTP
    let otp = Math.floor(100000 + Math.random() * 900000).toString();
    let createdAt = Date.now();
    let expireAt = createdAt + 60000; // 1 min expiry

    // ✅ Save OTP in DB
    await vendorModel.findByIdAndUpdate(vendorId, {
        $set: {
            otp: otp,
            otp_created_at: createdAt,
            otp_expire_at: expireAt
        }
    });

    return responseManager.onSuccess(
        "OTP resent successfully...",
        {
            otp: otp,
            vendorId: vendorData._id,
            country_code: vendorData.country_code || "+91"
        },
        res
    );
};
