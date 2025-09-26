const responseManager = require("../../../utilities/response.manager");
const mongoose = require("mongoose");
const AwsCloud = require("../../../utilities/aws");
const driverModel = require("../../../models/drivers.model");
const vendorModel = require("../../../models/vendors.model");

exports.addDriver = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        // ===== Request Body =====
        const {
            vendor_id,
            admin_id,
            driver_name,
            driver_mobile,
            dob,
            DL_number,
            DL_issue_date,
            DL_expiry_date,
            language_known,
            vehicales_drive,
            approve_reject_by,
        } = req.body;


        /** ------------------ CREATOR VALIDATION ------------------ **/
        if (vendor_id && admin_id) {
            return responseManager.badrequest(
                { message: "Pass either Vendor ID or Admin ID, not both" },
                res
            );
        }
        if ((!vendor_id || vendor_id.trim() === "") && (!admin_id || admin_id.trim() === "")) {
            return responseManager.badrequest(
                { message: "Either Vendor ID or Admin ID is required" },
                res
            );
        }

        let createdBy = null;
        let createdByType = null;
        if (vendor_id && vendor_id.trim() !== "") {
            if (!mongoose.Types.ObjectId.isValid(vendor_id)) {
                return responseManager.badrequest({ message: "Invalid Vendor ID" }, res);
            }
            createdBy = new mongoose.Types.ObjectId(vendor_id);
            createdByType = "vendor";
        }
        if (admin_id && admin_id.trim() !== "") {
            if (!mongoose.Types.ObjectId.isValid(admin_id)) {
                return responseManager.badrequest({ message: "Invalid Admin ID" }, res);
            }
            createdBy = new mongoose.Types.ObjectId(admin_id);
            createdByType = "admin";
        }


        if (!driver_name || driver_name.trim().length < 3) {
            return responseManager.badrequest(
                { message: "Invalid driver name" },
                res
            );
        }

        if (!driver_mobile || !/^[0-9]{10}$/.test(driver_mobile)) {
            return responseManager.badrequest(
                { message: "Invalid driver mobile" },
                res
            );
        }

        if (!dob || dob.trim() === "") {
            return responseManager.badrequest(
                { message: "Date of birth is required" },
                res
            );
        }
        if (!DL_number || DL_number.trim() === "") {
            return responseManager.badrequest(
                { message: "DL number is required" },
                res
            );
        }
        if (!DL_issue_date || DL_issue_date.trim() === "") {
            return responseManager.badrequest(
                { message: "DL issue date is required" },
                res
            );
        }
        if (!DL_expiry_date || DL_expiry_date.trim() === "") {
            return responseManager.badrequest(
                { message: "DL expiry date is required" },
                res
            );
        }

        // ===== Vendor Check =====
        const vendorData = await vendorModel.findById(vendor_id).lean();
        if (!vendorData || vendorData.status !== true) {
            return responseManager.badrequest(
                { message: "Vendor is not active or invalid" },
                res
            );
        }

        // ===== Duplicate Driver Mobile =====
        const existingDriver = await driverModel
            .findOne({ vendor_id, driver_mobile })
            .lean();
        if (existingDriver) {
            return responseManager.badrequest(
                { message: "Driver with this mobile number already exists." },
                res
            );
        }

        // ===== Age Restriction (>=18) =====
        const birthDate = new Date(dob);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        if (age < 18) {
            return responseManager.badrequest(
                { message: "Driver must be at least 18 years old" },
                res
            );
        }

        // ===== DL Expiry Validation =====
        if (new Date(DL_issue_date) >= new Date(DL_expiry_date)) {
            return responseManager.badrequest(
                { message: "DL expiry date must be after issue date" },
                res
            );
        }
        if (new Date(DL_expiry_date) < new Date()) {
            return responseManager.badrequest(
                { message: "DL is already expired" },
                res
            );
        }

        let approverId = null;
        if (approve_reject_by && approve_reject_by.trim() !== "") {
            if (!mongoose.Types.ObjectId.isValid(approve_reject_by)) {
                return responseManager.badrequest({ message: "Invalid Approver ID" }, res);
            }
            const approver = await vendorModel.findById(approve_reject_by).lean();
            if (!approver || approver.status !== true) {
                return responseManager.badrequest(
                    { message: "Approver is invalid or inactive" },
                    res
                );
            }
            approverId = approve_reject_by; // only if valid
        }

        // ===== Parse Arrays (from form-data strings) =====
        let parsedLanguages = [];
        let parsedVehicles = [];

        try {
            if (language_known) {
                parsedLanguages = JSON.parse(language_known);
            }
        } catch (e) {
            parsedLanguages = language_known ? [language_known] : [];
        }

        try {
            if (vehicales_drive) {
                parsedVehicles = JSON.parse(vehicales_drive);
            }
        } catch (e) {
            parsedVehicles = vehicales_drive ? [vehicales_drive] : [];
        }

        // ===== File Uploads to AWS =====
        const fileFields = ["driver_photo", "DL_photo"];
        let uploadedFiles = {};

        for (let field of fileFields) {
            const file = req.files && req.files[field] ? req.files[field][0] : null;
            if (!file)
                return responseManager.badrequest(
                    { message: `${field} is required` },
                    res
                );

            if (
                field === "driver_photo" &&
                !["image/jpeg", "image/png"].includes(file.mimetype)
            ) {
                return responseManager.badrequest(
                    { message: "Driver photo must be JPG/PNG only" },
                    res
                );
            }
            if (
                field === "DL_photo" &&
                !["image/jpeg", "image/png", "application/pdf"].includes(file.mimetype)
            ) {
                return responseManager.badrequest(
                    { message: "DL photo must be JPG/PNG/PDF only" },
                    res
                );
            }

            const filesizeinMb = parseFloat(file.size / 1048576);
            if (filesizeinMb > 5)
                return responseManager.badrequest(
                    { message: `${field} must be <= 5 MB` },
                    res
                );

            const uploadResult = await AwsCloud.saveToS3(
                file.buffer,
                "driver",
                file.mimetype,
                field
            );
            uploadedFiles[field] = uploadResult.data.Key;
        }

        // ===== Save Driver =====
        const driverObj = {

            vendor_id: vendor_id ? vendor_id : null,
            admin_id: admin_id ? admin_id : null,
            driver_name: driver_name.trim(),
            driver_mobile,
            dob,
            DL_number,
            DL_issue_date,
            DL_expiry_date,
            language_known: parsedLanguages,
            vehicales_drive: parsedVehicles,
            approve_reject_by: approverId,
            driver_photo: uploadedFiles.driver_photo,
            DL_photo: uploadedFiles.DL_photo,
            status: true, // default inactive
            approval_status: "pending",
            createdBy,
            updatedBy: createdBy,
            createAtTimestamp: Date.now(),
            updateAtTimestamp: Date.now(),
        };

        const newDriver = await driverModel.create(driverObj);
        return responseManager.onSuccess(
            "Driver added successfully",
            { newDriver, createdByType, createdById: createdBy },
            res
        );
    } catch (err) {
        return responseManager.onError(err, res);
    }
};


exports.driverLogin = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        const { driver_mobile } = req.body;

        // ===== Validation =====
        if (!driver_mobile || !/^[0-9]{10}$/.test(driver_mobile)) {
            return responseManager.badrequest(
                { message: "Invalid driver mobile number" },
                res
            );
        }

        // ===== Check Driver Exists =====
        const existingDriver = await driverModel.findOne({ driver_mobile }).lean();
        if (!existingDriver) {
            return responseManager.badrequest(
                { message: "Driver with this mobile number not found" },
                res
            );
        }

        // ===== Generate Random 6 digit OTP =====
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // ===== Set Expiry (1 min = 60,000 ms) =====
        const expiryTime = Date.now() + 60 * 1000;

        // ===== Store OTP & Expiry in DB =====
        await driverModel.findByIdAndUpdate(existingDriver._id, {
            $set: {
                otp: otp,
                otp_expiry: expiryTime,
                updateAtTimestamp: Date.now()
            }
        });

        return responseManager.onSuccess(
            "OTP sent successfully",
            { driver_mobile, otp, validTill: new Date(expiryTime) },
            res
        );
    } catch (err) {
        return responseManager.onError(err, res);
    }
};


exports.verifyOtp = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        const { driver_mobile, otp } = req.body;

        // ===== Validation =====
        if (!driver_mobile || !/^[0-9]{10}$/.test(driver_mobile)) {
            return responseManager.badrequest(
                { message: "Invalid driver mobile number" },
                res
            );
        }
        if (!otp || otp.trim().length !== 6) {
            return responseManager.badrequest(
                { message: "Invalid OTP" },
                res
            );
        }

        // ===== Find Driver =====
        const driverData = await driverModel.findOne({ driver_mobile }).lean();
        if (!driverData) {
            return responseManager.badrequest(
                { message: "Driver not found" },
                res
            );
        }

        // ===== Check OTP & Expiry =====
        if (!driverData.otp || !driverData.otp_expiry) {
            return responseManager.badrequest(
                { message: "OTP not generated. Please request again." },
                res
            );
        }

        if (driverData.otp !== otp) {
            return responseManager.badrequest(
                { message: "Invalid OTP" },
                res
            );
        }

        if (Date.now() > driverData.otp_expiry) {
            return responseManager.badrequest(
                { message: "OTP expired. Please request again." },
                res
            );
        }

        // ===== Clear OTP after success =====
        await driverModel.findByIdAndUpdate(driverData._id, {
            $unset: { otp: 1, otp_expiry: 1 },
            $set: { updateAtTimestamp: Date.now(), lastLogin: Date.now() }
        });

        return responseManager.onSuccess(
            "OTP verified successfully",
            {
                driver_id: driverData._id,
                driver_name: driverData.driver_name,
                driver_mobile: driverData.driver_mobile,
                status: driverData.status,
            },
            res
        );
    } catch (err) {
        return responseManager.onError(err, res);
    }
};
