const responseManager = require("../../../../utilities/response.manager");
const vendorModel = require("../../../../models/vendors.model");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

exports.vendorApproved = async (req, res) => {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { vendorId } = req.body;

    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
        return responseManager.badrequest(
            { message: "Invalid vendorId, please provide valid id" },
            res
        );
    }

    try {
        // 🔹 Find vendor
        let vendorData = await vendorModel.findById(vendorId);

        if (!vendorData) {
            return responseManager.badrequest(
                { message: "Vendor not found, please try again with valid vendorId" },
                res
            );
        }

        if (vendorData.approval_status === "approved") {
            return responseManager.badrequest(
                { message: "Vendor is already approved" },
                res
            );
        }

        // 🔹 Update approval_status = approved
        vendorData.approval_status = "approved";
        await vendorData.save();

        // ✅ Send mail process (same as forget password API style)
        let mailTransporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD
            }
        });

        let toEmail = vendorData.company_email || vendorData.owner_email;

        if (toEmail) {
            let mailDetails = {
                from: process.env.EMAIL,
                to: toEmail,
                subject: "🎉 Congratulations! Your Vendor Account is Approved",
                text: `Dear ${vendorData.owner_name},

We are pleased to inform you that your vendor account has been successfully approved. 🎊

You can now access your account and start using all the services and features available to our valued vendors.

If you have any questions or need assistance, feel free to contact our support team.

Welcome aboard, and we look forward to a great partnership ahead!

Best regards,  
Bambam Cabs Team`
            };


            mailTransporter.sendMail(mailDetails, function (error) {
                if (error) {
                    return responseManager.onError(error, res);
                } else {
                    return responseManager.onSuccess(
                        "Vendor approved successfully and mail sent...",
                        vendorData,
                        res
                    );
                }
            });
        } else {
            return responseManager.onSuccess(
                "Vendor approved successfully but no email found to send mail...",
                vendorData,
                res
            );
        }

    } catch (err) {
        console.error(err);
        return responseManager.onError(err, res);
    }
};
