const responseManager = require("../../../../utilities/response.manager");
const mongoose = require("mongoose");
const specialServicesModel = require("../../../../models/Admin/Master/Special_Services.model");
const mongoConnection = require('../../../../utilities/connections');
const constants = require('../../../../utilities/constants');
const config = require('../../../../utilities/config');
const adminsModel = require('../../../../models/admins.model');
const XLSX = require("xlsx");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

/** =================== Add Special Service =================== **/
exports.addSpecialService = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);

            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                const { description, amount } = req.body;

                /** ===== Validation ===== **/
                if (!description || description.trim().length < 3) {
                    return responseManager.badrequest({ message: "Description must be at least 3 characters long" }, res);
                }
                if (!amount || isNaN(amount)) {
                    return responseManager.badrequest({ message: "Amount is required and must be a number" }, res);
                }

                /** ===== Duplicate check ===== **/
                const existing = await specialServicesModel.findOne({
                    description: { $regex: new RegExp(`^${description.trim()}$`, "i") }
                }).lean();
                if (existing) {
                    return responseManager.badrequest({ message: "Special Service with this description already exists" }, res);
                }

                const createdBy = req.token.adminId;
                const specialServiceObj = {
                    description: description.trim(),
                    amount: parseFloat(amount),
                    status: true,
                    admin_id: createdBy,
                    createdBy,
                    updatedBy: createdBy,
                    createdAtTimestamp: Date.now(),
                    updatedAtTimestamp: Date.now()
                };

                const newService = await specialServicesModel.create(specialServiceObj);

                return responseManager.onSuccess("Special Service added successfully", newService, res);
            } else {
                return responseManager.unauthorisedRequest(res);
            }
        } else {
            return responseManager.unauthorisedRequest(res);
        }
    } catch (err) {
        return responseManager.onError(err, res);
    }
};


/** =================== List Special Services =================== **/
exports.listSpecialServices = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);

            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                let { page = 1, limit = 10, search = "", status, date } = req.query;

                let query = {};
                if (search && search.trim() !== "") {
                    query.description = { $regex: new RegExp(search.trim(), "i") };
                }
                if (status !== undefined) {
                    query.status = status === "true";
                }
                if (date) {
                    let start = new Date(date); start.setHours(0, 0, 0, 0);
                    let end = new Date(date); end.setHours(23, 59, 59, 999);
                    query.createdAt = { $gte: start, $lte: end };
                }

                const options = {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    sort: { createdAt: -1 },
                    lean: true
                };

                const result = await specialServicesModel.paginate(query, options);
                return responseManager.onSuccess("Special Services fetched successfully", result, res);

            } else {
                return responseManager.unauthorisedRequest(res);
            }
        } else {
            return responseManager.unauthorisedRequest(res);
        }

    } catch (err) {
        return responseManager.onError(err, res);
    }
};


/** =================== Get By ID =================== **/
exports.getSpecialServiceById = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);

            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return responseManager.badrequest({ message: "Invalid Special Service ID" }, res);
                }

                const service = await specialServicesModel.findById(id).lean();
                if (!service) {
                    return responseManager.badrequest({ message: "Special Service not found" }, res);
                }

                return responseManager.onSuccess("Special Service fetched successfully", service, res);
               
            } else {
                return responseManager.unauthorisedRequest(res);
            }
        } else {
            return responseManager.unauthorisedRequest(res);
        }
    } catch (err) {
        return responseManager.onError(err, res);
    }
};


/** =================== Update =================== **/
exports.updateSpecialService = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);

            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                const { description, amount } = req.body;

                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return responseManager.badrequest({ message: "Invalid Special Service ID" }, res);
                }

                let updateObj = {};
                if (description) updateObj.description = description.trim();
                if (amount) updateObj.amount = parseFloat(amount);
                updateObj.updatedAtTimestamp = Date.now();

                const updated = await specialServicesModel.findByIdAndUpdate(id, updateObj, { new: true }).lean();

                return responseManager.onSuccess("Special Service updated successfully", updated, res);
            } else {
                return responseManager.unauthorisedRequest(res);
            }
        } else {
            return responseManager.unauthorisedRequest(res);
        }

    } catch (err) {
        return responseManager.onError(err, res);
    }
};


/** =================== Delete =================== **/
exports.deleteSpecialService = async (req, res) => {
    try {

        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);

            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return responseManager.badrequest({ message: "Invalid Special Service ID" }, res);
                }

                await specialServicesModel.findByIdAndDelete(id);

                return responseManager.onSuccess("Special Service deleted successfully", {}, res);
            } else {
                return responseManager.unauthorisedRequest(res);
            }
        } else {
            return responseManager.unauthorisedRequest(res);
        }
    } catch (err) {
        return responseManager.onError(err, res);
    }
};


/** =================== Toggle Status =================== **/
exports.toggleSpecialServiceStatus = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);

            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return responseManager.badrequest({ message: "Invalid Special Service ID" }, res);
                }

                const service = await specialServicesModel.findById(id).lean();
                if (!service) {
                    return responseManager.badrequest({ message: "Special Service not found" }, res);
                }

                const updated = await specialServicesModel.findByIdAndUpdate(
                    id,
                    { status: !service.status, updatedAtTimestamp: Date.now() },
                    { new: true }
                ).lean();

                return responseManager.onSuccess("Special Service status updated successfully", updated, res);
            } else {
                return responseManager.unauthorisedRequest(res);
            }
        } else {
            return responseManager.unauthorisedRequest(res);
        }

    } catch (err) {
        return responseManager.onError(err, res);
    }
};


/** =================== Export =================== **/
exports.exportSpecialServices = async (req, res) => {
    try {
        let { search = "", status, date } = req.query;

        let query = {};
        if (search && search.trim() !== "") query.description = { $regex: new RegExp(search.trim(), "i") };
        if (status !== undefined) query.status = status === "true";
        if (date) {
            let start = new Date(date); start.setHours(0, 0, 0, 0);
            let end = new Date(date); end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        const services = await specialServicesModel.find(query).lean();
        if (!services || services.length === 0) {
            return responseManager.badrequest({ message: "No data found to export" }, res);
        }

        const cleaned = services.map((s, i) => {
            const { admin_id, createdBy, updatedBy, __v, ...rest } = s;
            return { "Sr No": i + 1, ...rest };
        });

        const ws = XLSX.utils.json_to_sheet(cleaned);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "SpecialServices");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Disposition", "attachment; filename=special_services.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        return res.send(buffer);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};


/** =================== Import =================== **/
exports.importSpecialServices = async (req, res) => {
    try {
        if (!req.file) {
            return responseManager.badrequest({ message: "Please upload a file" }, res);
        }

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!data || data.length === 0) {
            return responseManager.badrequest({ message: "File is empty or invalid" }, res);
        }

        const now = Date.now();
        const adminId = req?.token?.adminId || new mongoose.Types.ObjectId();

        const existing = await specialServicesModel.find({}, { description: 1 }).lean();
        const existingNames = existing.map(v => v.description.toLowerCase());

        const newServices = data
            .filter(item => item.description && !existingNames.includes(item.description.toLowerCase()))
            .map(item => ({
                ...item,
                createdBy: adminId,
                updatedBy: adminId,
                createdAtTimestamp: now,
                updatedAtTimestamp: now,
                status: true
            }));

        if (newServices.length === 0) {
            return responseManager.badrequest({ message: "All services already exist, nothing to import" }, res);
        }

        const inserted = await specialServicesModel.insertMany(newServices);
        const totalCount = await specialServicesModel.countDocuments();

        return responseManager.onSuccess(
            `${inserted.length} services imported successfully. Total: ${totalCount}`,
            { inserted, totalCount },
            res
        );

    } catch (err) {
        return responseManager.onError(err, res);
    }
};
