const responseManager = require("../../../../utilities/response.manager");
const vendorModel = require("../../../../models/vendors.model");
const nodemailer = require("nodemailer");

exports.vendorRejected = async (req, res) => {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    try {
        const { vendorId, reason } = req.body;

        if (!vendorId || !reason || reason.trim() === "") {
            return responseManager.badrequest(
                { message: "Vendor ID and rejection reason are required" },
                res
            );
        }

        // Find vendor
        let vendorData = await vendorModel.findById(vendorId);
        if (!vendorData) {
            return responseManager.badrequest({ message: "Invalid Vendor ID" }, res);
        }

        // Update vendor status
        vendorData.approval_status = "rejected";
        vendorData.rejected_reason = reason;
        await vendorData.save();

        // Prepare email
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD,
            },
        });

        let toEmail = vendorData.company_email || vendorData.owner_email;
        if (toEmail) {
            let mailOptions = {
                from: process.env.EMAIL,
                to: toEmail,
                subject: "Update on Your Vendor Application",
                text: `Dear ${vendorData.owner_name},

Thank you for your interest in partnering with us. After carefully reviewing your application, we regret to inform you that your vendor account has not been approved at this time.

Reason for rejection: ${reason}

If you believe this decision was made in error or if you would like to reapply after addressing the mentioned reason, please feel free to reach out to our support team.

We truly appreciate the time and effort you invested in your application and wish you the best in your future endeavors.

Best regards,  
Bambam Cabs Team`
            };

            transporter.sendMail(mailOptions, function (err) {
                if (err) {
                    console.error("Mail error:", err);
                }
            });
        }

        return responseManager.onSuccess(
            "Vendor rejected and mail sent successfully",
            1,
            res
        );
    } catch (err) {
        console.error(err);
        return responseManager.onError(err, res);
    }
};
