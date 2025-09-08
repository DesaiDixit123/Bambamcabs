const responseManager = require("../../../../../utilities/response.manager");
const vendorModel = require("../../../../../models/vendors.model");

exports.vendorForgetIndivisualVerifyOtp = async (req, res) => {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { owner_email, otp } = req.body;

    if (!owner_email || !otp) {
        return responseManager.badrequest(
            { message: "Email and OTP are required" },
            res
        );
    }

    try {
        let vendorData = await vendorModel.findOne({
            owner_email: { $regex: new RegExp(`^${owner_email.trim()}$`, "i") }
        });

        if (!vendorData) {
            return responseManager.badrequest(
                { message: "Vendor not found with this email" },
                res
            );
        }

        if (vendorData.otp !== otp) {
            return responseManager.badrequest(
                { message: "Invalid OTP" },
                res
            );
        }

        if (Date.now() > vendorData.otp_expire_at) {
            return responseManager.badrequest(
                { message: "OTP expired, please request a new one" },
                res
            );
        }

        // OTP verified, clear OTP fields
        await vendorModel.findByIdAndUpdate(vendorData._id, {
            otp: "",
            otp_created_at: 0,
            otp_expire_at: 0
        });

        return responseManager.onSuccess(
            "OTP verified successfully",
            1,
            res
        );
    } catch (err) {
        console.error(err);
        return responseManager.onError(err, res);
    }
};
