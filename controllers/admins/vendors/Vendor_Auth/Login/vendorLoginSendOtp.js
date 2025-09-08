const responseManager = require("../../../../../utilities/response.manager");
const helper = require("../../../../../utilities/helper");
const vendorModel = require("../../../../../models/vendors.model");
const bcrypt = require("bcryptjs");
const mongoConnection = require("../../../../../utilities/connections");
const constants = require("../../../../../utilities/constants");
const nodemailer = require("nodemailer");



exports.vendorLoginSendOtp = async (req, res) => {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { owner_mobile, country_code } = req.body;

    if (!owner_mobile || owner_mobile.trim() === "") {
        return responseManager.badrequest(
            { message: "Mobile number is required...!" },
            res
        );
    }

    // ✅ Normalize country_code
    let finalCountryCode = "+91"; // default
    if (country_code && country_code.trim() !== "") {
        if (country_code.startsWith("+")) {
            finalCountryCode = country_code.trim();
        } else {
            finalCountryCode = "+" + country_code.trim();
        }
    }

    // ✅ Vendor check
    let vendorData = await vendorModel.findOne({
        owner_mobile: owner_mobile.trim(),
        country_code: finalCountryCode
    }).lean();

    if (!vendorData) {
        return responseManager.badrequest(
            { message: "Mobile number not registered. Please sign up first...!" },
            res
        );
    }

    if (vendorData.approval_status !== "approved") {
        return responseManager.badrequest(
            { message: "Your account is not approved yet. Please contact admin...!" },
            res
        );
    }

    // ✅ Generate OTP (6 digit)
    let otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ✅ Expiry Time (1 minute)
    let expiryTime = Date.now() + 60 * 1000; // 60 sec = 1 min

    // ✅ Save OTP with expiry
    await vendorModel.findByIdAndUpdate(vendorData._id, {
        $set: {
            otp: otp,
            otp_created_at: Date.now(),
            otp_expire_at: expiryTime,   // 👈 new field
            country_code: finalCountryCode
        }
    });

    return responseManager.onSuccess(
        "OTP sent successfully... (valid for 1 minute)",
        {
            otp: otp,
            vendorId: vendorData._id,
            country_code: finalCountryCode,
            expires_in: "1 minute"
        },
        res
    );
};