const responseManager = require("../../../../../utilities/response.manager");
const helper = require("../../../../../utilities/helper");
const vendorModel = require("../../../../../models/vendors.model");
const bcrypt = require("bcryptjs");
const mongoConnection = require("../../../../../utilities/connections");
const constants = require("../../../../../utilities/constants");
const nodemailer = require("nodemailer");

exports.vendorVerifyOtp = async (req, res) => {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { vendorId, otp } = req.body;

    if (!vendorId || !otp) {
        return responseManager.badrequest(
            { message: "VendorId and OTP are required...!" },
            res
        );
    }

    let vendorData = await vendorModel.findById(vendorId).lean();
    if (!vendorData) {
        return responseManager.badrequest(
            { message: "Vendor not found...!" },
            res
        );
    }

    // ✅ Expiry check
    if (!vendorData.otp_expire_at || Date.now() > vendorData.otp_expire_at) {
        return responseManager.badrequest(
            { message: "OTP expired. Please request a new one...!" },
            res
        );
    }

    if (vendorData.otp !== otp) {
        return responseManager.badrequest(
            { message: "Invalid OTP, Please try again...!" },
            res
        );
    }

    // ✅ token generate
    let accesstoken = await helper.generateAccessToken({
        vendorId: vendorData._id.toString(),
    });

    // ✅ update vendor
    await vendorModel.findByIdAndUpdate(vendorData._id, {
        $set: { jwt_token: accesstoken, updateAtTimestamp: Date.now() },
        $unset: { otp: "", otp_created_at: "", otp_expire_at: "" }
    });

    let updatedVendor = await vendorModel.findById(vendorData._id).lean();

    return responseManager.onSuccess(
        "OTP verified successfully, Login successful...",
        { accesstoken: accesstoken, vendordetails: updatedVendor },
        res
    );
};