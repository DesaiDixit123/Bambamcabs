const responseManager = require("../../../../../utilities/response.manager");
const helper = require("../../../../../utilities/helper");
const vendorModel = require("../../../../../models/vendors.model");
const bcrypt = require("bcryptjs");
const mongoConnection = require("../../../../../utilities/connections");
const constants = require("../../../../../utilities/constants");
const nodemailer = require("nodemailer");

exports.vendorUpdatePassword = async (req, res) => {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    try {
        const { vendorId, oldPassword, newPassword } = req.body;

        if (!vendorId || !oldPassword || !newPassword) {
            return responseManager.badrequest(
                { message: "VendorId, oldPassword and newPassword are required...!" },
                res
            );
        }

        // ✅ Find vendor
        let vendorData = await vendorModel.findById(vendorId).lean();
        if (!vendorData) {
            return responseManager.badrequest(
                { message: "Vendor not found...!" },
                res
            );
        }

        // ✅ Compare old password
        const isMatch = await bcrypt.compare(oldPassword, vendorData.password);
        if (!isMatch) {
            return responseManager.badrequest(
                { message: "Old password is incorrect...!" },
                res
            );
        }

        // ✅ Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // ✅ Save new password
        await vendorModel.findByIdAndUpdate(vendorId, {
            $set: { password: hashedPassword }
        });

        return responseManager.onSuccess(
            "Password updated successfully...!",
            1,
            res
        );

    } catch (error) {
        return responseManager.onError(error, res);
    }
};
