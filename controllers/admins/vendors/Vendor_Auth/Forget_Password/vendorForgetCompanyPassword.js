const responseManager = require("../../../../../utilities/response.manager");
const helper = require("../../../../../utilities/helper");
const vendorModel = require("../../../../../models/vendors.model");
const nodemailer = require("nodemailer");

exports.vendorForgetCompanyPassword = async (req, res) => {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { company_email } = req.body;

    if (
        !company_email ||
        company_email.trim() === "" ||
        !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(company_email)
    ) {
        return responseManager.badrequest(
            { message: "Invalid email format, please provide valid email and try again...!" },
            res
        );
    }

    try {
        // find vendor by email (case-insensitive)
        let vendorData = await vendorModel.findOne({
            company_email: { $regex: new RegExp(`^${company_email.trim()}$`, "i") }
        });

        if (!vendorData) {
            return responseManager.badrequest(
                { message: "Invalid email to forget password, please provide valid registered email and try again...!" },
                res
            );
        }

        // ✅ Generate OTP
        let otp = await helper.generateotp(6);

        // ✅ Update vendor with new OTP & timestamps
        await vendorModel.findByIdAndUpdate(vendorData._id, {
            otp: otp,
            otp_created_at: Date.now(),
            otp_expire_at: Date.now() + 1 * 60 * 1000 // 1 min expiry
        });

        // ✅ Send mail only if approved
        if (vendorData.approval_status === "approved") {
            let mailTransporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL,
                    pass: process.env.PASSWORD
                }
            });

            let mailDetails = {
                from: process.env.EMAIL,
                to: company_email,
                subject: "OTP For Vendor Forget Password",
                text: `Your OTP for vendor password reset is: ${otp}`
            };

            mailTransporter.sendMail(mailDetails, function (error) {
                if (error) {
                    return responseManager.onError(error, res);
                } else {
                    return responseManager.onSuccess(
                        "OTP sent successfully...",
                        1,
                        res
                    );
                }
            });
        } else {
            return responseManager.badrequest(
                { message: `Vendor not approved yet. Current status: ${vendorData.approval_status}` },
                res
            );
        }
    } catch (err) {
        console.error(err);
        return responseManager.onError(err, res);
    }
};
