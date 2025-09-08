const responseManager = require("../../../../../utilities/response.manager");
const vendorModel = require("../../../../../models/vendors.model");
const bcrypt = require("bcryptjs");

exports.vendorForgetIndivisualResetPassword = async (req, res) => {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { owner_email, otp, new_password, confirm_new_password } = req.body;

    // 🔎 Basic validation
    if (!owner_email || !otp || !new_password || !confirm_new_password) {
        return responseManager.badrequest(
            { message: "Email, OTP, new password and confirm password are required" },
            res
        );
    }

    if (new_password !== confirm_new_password) {
        return responseManager.badrequest(
            { message: "New password and confirm password do not match" },
            res
        );
    }

    try {
        // 🔎 Find vendor
        let vendorData = await vendorModel.findOne({
            owner_email: { $regex: new RegExp(`^${owner_email.trim()}$`, "i") }
        });

        if (!vendorData) {
            return responseManager.badrequest(
                { message: "Vendor not found with this email" },
                res
            );
        }

        // 🔎 Validate OTP
        if (
            vendorData.otp !== otp ||
            Date.now() > vendorData.otp_expire_at
        ) {
            return responseManager.badrequest(
                { message: "Invalid or expired OTP" },
                res
            );
        }

        // 🔑 Encrypt new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        // ✅ Update vendor password and clear otp
        await vendorModel.findByIdAndUpdate(vendorData._id, {
            password: hashedPassword,
            otp: null,
            otp_created_at: null,
            otp_expire_at: null
        });

        return responseManager.onSuccess(
            "Password reset successfully",
            1,
            res
        );
    } catch (err) {
        console.error(err);
        return responseManager.onError(err, res);
    }
};
