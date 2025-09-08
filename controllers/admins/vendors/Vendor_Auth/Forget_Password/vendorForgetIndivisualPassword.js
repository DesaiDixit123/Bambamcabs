const responseManager = require("../../../../../utilities/response.manager");
const helper = require("../../../../../utilities/helper");
const vendorModel = require("../../../../../models/vendors.model");
const nodemailer = require("nodemailer");

exports.vendorForgetIndivisualPassword = async (req, res) => {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { owner_email } = req.body;

    // ===== Validation =====
    if (
        !owner_email ||
        owner_email.trim() === "" ||
        !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(owner_email)
    ) {
        return responseManager.badrequest(
            { message: "Invalid email format, please provide valid email and try again...!" },
            res
        );
    }

    try {
        // 🔎 Find vendor by owner_email (case-insensitive)
        let vendorData = await vendorModel.findOne({
            owner_email: { $regex: new RegExp(`^${owner_email.trim()}$`, "i") }
        });

        if (!vendorData) {
            return responseManager.badrequest(
                { message: "Invalid email to forget password, please provide valid registered email and try again...!" },
                res
            );
        }

        // ✅ Generate OTP
        let otp = await helper.generateotp(6);

        // ✅ Save OTP + Expiry (use otp fields)
        await vendorModel.findByIdAndUpdate(vendorData._id, {
            otp: otp,
            otp_created_at: Date.now(),
            otp_expire_at: Date.now() + 1 * 60 * 1000 // 1 min expiry
        });

        // ✅ Mail Transporter (only if approved)
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
                to: owner_email,
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
