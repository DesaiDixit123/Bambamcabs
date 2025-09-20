const responseManager = require("../../../utilities/response.manager");
const mongoose = require("mongoose");
const AwsCloud = require("../../../utilities/aws");
const vehicleModel = require("../../../models/vehicles.model");
const qs = require("qs");

// 🔹 Normalize array input (0,1,2 indexes handle)
const normalizeArray = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === "object") return Object.values(field); // fix: object to array
    return [];
};

// 🔹 Sanitize facilities/features array with logo upload
const sanitizeArray = async (arr, fieldPrefix, files) => {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    let sanitized = [];
    for (let i = 0; i < arr.length; i++) {
        let item = arr[i];
        if (!item || typeof item !== "object") continue;

        let desc = item.description?.trim() || "";
        if (desc.length < 2) continue;

        // Dynamic file field (multer saves by fieldname)
        let fileField = `${fieldPrefix}[${i}][logo]`;
        let file = files?.[fileField]?.[0] || null;

        if (!file) continue;
        if (!file.mimetype.startsWith("image/")) continue;
        if (file.size / (1024 * 1024) > 5) continue;

        let uploadResult = await AwsCloud.saveToS3(
            file.buffer,
            "vehicles/facilities",
            file.mimetype,
            fieldPrefix
        );

        sanitized.push({ logo: uploadResult.data.Key, description: desc });
    }
    return sanitized;
};

exports.addVehicle = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        // 🔹 Parse nested fields (qs handles form-data like include_facilities[0][description])
        if (req.body && typeof req.body === "object") {
            req.body = qs.parse(req.body);
        }

        let {
            vendor_id,
            admin_id,
            brand_name,
            vehicle_type,
            vehicle_number,
            fuel_type,
            vehicle_make_year,
            sourcing,
            pet_friendly,
            luggage_carrier,
            working_rear_seat_belts,
            insurance_expiry,
            fitness_expiry,
            permit_expiry,
            permit_type,
            include_facilities,
            exclude_facilities,
            vehicles_features,
            terms_conditions
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

        /** ------------------ FIELD VALIDATIONS ------------------ **/
        if (!brand_name || brand_name.trim().length < 2) {
            return responseManager.badrequest({ message: "Brand name must be at least 2 chars" }, res);
        }
        if (!vehicle_number || !/^[A-Z0-9-]{3,15}$/.test(vehicle_number.trim())) {
            return responseManager.badrequest({ message: "Vehicle number invalid format" }, res);
        }
        let existing = await vehicleModel.findOne({ vehicle_number: vehicle_number.trim() }).lean();
        if (existing) {
            return responseManager.badrequest({ message: "Vehicle number already exists" }, res);
        }
        if (!vehicle_make_year || !/^\d{4}$/.test(vehicle_make_year) || parseInt(vehicle_make_year) < 1990) {
            return responseManager.badrequest({ message: "Invalid vehicle make year" }, res);
        }

        // ✅ Expiry date validation
        const checkFutureDate = (dateStr, field) => {
            if (!dateStr) return { valid: false, msg: `${field} is required` };
            let dt = new Date(dateStr);
            if (isNaN(dt.getTime())) return { valid: false, msg: `${field} invalid date` };
            if (dt < new Date()) return { valid: false, msg: `${field} must be in future` };
            return { valid: true };
        };
        for (let [dateVal, field] of [
            [insurance_expiry, "Insurance expiry"],
            [fitness_expiry, "Fitness expiry"],
            [permit_expiry, "Permit expiry"]
        ]) {
            let resCheck = checkFutureDate(dateVal, field);
            if (!resCheck.valid) return responseManager.badrequest({ message: resCheck.msg }, res);
        }

        /** ------------------ REQUIRED DOCUMENTS UPLOAD ------------------ **/
        const imageFields = [
            "car_photo",
            "insurance_document",
            "fitness_document",
            "permit_document",
            "puc_document",
            "rc_image"
        ];
        let uploadedFiles = {};
        for (let field of imageFields) {
            let file = req.files?.[field]?.[0] || null;
            if (!file) {
                return responseManager.badrequest({ message: `${field} is required` }, res);
            }
            if (!file.mimetype || (!file.mimetype.startsWith("image/") && file.mimetype !== "application/pdf")) {
                return responseManager.badrequest({ message: `${field} must be image/pdf` }, res);
            }
            let sizeMb = file.size / (1024 * 1024);
            if (sizeMb > 5) {
                return responseManager.badrequest({ message: `${field} must be <= 5MB` }, res);
            }
            let uploadResult = await AwsCloud.saveToS3(file.buffer, "vehicles", file.mimetype, field);
            uploadedFiles[field] = uploadResult.data.Key;
        }

        /** ------------------ FACILITIES / FEATURES ------------------ **/
        let includeArr = normalizeArray(include_facilities);
        let excludeArr = normalizeArray(exclude_facilities);
        let featuresArr = normalizeArray(vehicles_features);

        let sanitizedIncludeFacilities = await sanitizeArray(includeArr, "include_facilities", req.files);
        let sanitizedExcludeFacilities = await sanitizeArray(excludeArr, "exclude_facilities", req.files);
        let sanitizedVehicleFeatures = await sanitizeArray(featuresArr, "vehicles_features", req.files);

        /** ------------------ FINAL OBJECT ------------------ **/
        let vehicleObj = {
            vendor_id: vendor_id ? vendor_id : null,
            admin_id: admin_id ? admin_id : null,
            brand_name: brand_name.trim(),
            vehicle_type: new mongoose.Types.ObjectId(vehicle_type),
            vehicle_number: vehicle_number.trim(),
            fuel_type: Array.isArray(fuel_type)
                ? fuel_type.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id))
                : (mongoose.Types.ObjectId.isValid(fuel_type) ? [new mongoose.Types.ObjectId(fuel_type)] : []),
            vehicle_make_year,
            sourcing: sourcing || "",
            pet_friendly: ["Yes", "No"].includes(pet_friendly) ? pet_friendly : "No",
            luggage_carrier: ["Yes", "No"].includes(luggage_carrier) ? luggage_carrier : "No",
            working_rear_seat_belts: ["Yes", "No"].includes(working_rear_seat_belts) ? working_rear_seat_belts : "No",
            insurance_expiry,
            fitness_expiry,
            permit_expiry,
            permit_type: permit_type || "",
            ...uploadedFiles,
            include_facilities: sanitizedIncludeFacilities,
            exclude_facilities: sanitizedExcludeFacilities,
            vehicles_features: sanitizedVehicleFeatures,
            status: true,
            approval_status: "pending",
            terms_conditions: terms_conditions?.trim() || "",
            createdBy,
            updatedBy: createdBy,
            createAtTimestamp: Date.now(),
            updateAtTimestamp: Date.now(),
        };

        /** ------------------ SAVE & POPULATE ------------------ **/
        let newVehicle = await vehicleModel.create(vehicleObj);

        let populatedFuelType = await vehicleModel.findById(newVehicle._id)
            .populate("fuel_type", "name") // only return fuel type name
            .lean();
        let populatedVehicleType = await vehicleModel.findById(newVehicle._id)
            .populate("vehicle_type", "name") // only return fuel type name
            .lean();

        return responseManager.onSuccess(
            "Vehicle added successfully",
            { ...populatedFuelType, ...populatedVehicleType, createdByType, createdById: createdBy },
            res
        );
    } catch (err) {
        console.error("🔥 ERROR:", err);
        return responseManager.onError(err, res);
    }
};
