const responseManager = require("../../../../../utilities/response.manager");
const vendorModel = require("../../../../../models/vendors.model");
const bcrypt = require("bcryptjs");

exports.vendorResetCompanyPassword = async (req, res) => {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { company_email, otp, new_password, confirm_new_password } = req.body;

    // ===== Validation =====
    if (!company_email || !otp || !new_password || !confirm_new_password) {
        return responseManager.badrequest(
            { message: "Email, OTP, new password and confirm password are required...!" },
            res
        );
    }

    if (new_password !== confirm_new_password) {
        return responseManager.badrequest(
            { message: "New password and confirm password do not match...!" },
            res
        );
    }

    try {
        // 🔎 Find vendor
        let vendorData = await vendorModel.findOne({
            company_email: { $regex: new RegExp(`^${company_email.trim()}$`, "i") }
        });

        if (!vendorData) {
            return responseManager.badrequest(
                { message: "Invalid email, no vendor found...!" },
                res
            );
        }

        // 🔎 Validate OTP
        if (vendorData.otp !== otp || Date.now() > vendorData.otp_expire_at) {
            return responseManager.badrequest(
                { message: "Invalid or expired OTP, please try again...!" },
                res
            );
        }

        // 🔑 Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        // ✅ Update vendor password and clear OTP
        await vendorModel.findByIdAndUpdate(vendorData._id, {
            password: hashedPassword,
            otp: null,
            otp_created_at: null,
            otp_expire_at: null
        });

        return responseManager.onSuccess(
            "Password reset successfully...!",
            1,
            res
        );
    } catch (err) {
        console.error(err);
        return responseManager.onError(err, res);
    }
};
