const responseManager = require("../../../../../utilities/response.manager");
const vendorModel = require("../../../../../models/vendors.model");

exports.vendorVerifyCompanyOtp = async (req, res) => {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { company_email, otp } = req.body;

    if (!company_email || !otp) {
        return responseManager.badrequest(
            { message: "Email and OTP are required...!" },
            res
        );
    }

    try {
        let vendorData = await vendorModel.findOne({
            company_email: { $regex: new RegExp(`^${company_email.trim()}$`, "i") }
        });

        if (!vendorData) {
            return responseManager.badrequest(
                { message: "Invalid email, no vendor found...!" },
                res
            );
        }

        if (
            vendorData.otp !== otp ||
            Date.now() > vendorData.otp_expire_at
        ) {
            return responseManager.badrequest(
                { message: "Invalid or expired OTP, please try again...!" },
                res
            );
        }

        return responseManager.onSuccess("OTP verified successfully...!", 1, res);
    } catch (err) {
        console.error(err);
        return responseManager.onError(err, res);
    }
};
