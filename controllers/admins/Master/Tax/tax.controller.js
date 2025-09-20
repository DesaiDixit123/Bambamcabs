const responseManager = require("../../../../utilities/response.manager");
const mongoose = require("mongoose");
const taxModel = require("../../../../models/Admin/Master/tax.model");
const mongoConnection = require('../../../../utilities/connections');
const constants = require('../../../../utilities/constants');
const config = require('../../../../utilities/config');
const adminsModel = require('../../../../models/admins.model');
const XLSX = require("xlsx");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

/** =================== Add Tax =================== **/
exports.addTax = async (req, res) => {
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
                const { tax_name, tax_type, tax_rate, applicable_on } = req.body;

                /** ===== Validation ===== **/
                if (!tax_name || tax_name.trim().length < 2) {
                    return responseManager.badrequest({ message: "Tax name must be at least 2 characters long" }, res);
                }
                if (!["%", "₹"].includes(tax_type)) {
                    return responseManager.badrequest({ message: "Invalid tax type" }, res);
                }
                if (!tax_rate || isNaN(tax_rate)) {
                    return responseManager.badrequest({ message: "Tax rate is required and must be a number" }, res);
                }
                if (!applicable_on || !Array.isArray(applicable_on) || applicable_on.length === 0) {
                    return responseManager.badrequest({ message: "Applicable On is required" }, res);
                }

                /** ===== Duplicate check ===== **/
                const existing = await taxModel.findOne({
                    tax_name: { $regex: new RegExp(`^${tax_name.trim()}$`, "i") }
                }).lean();
                if (existing) {
                    return responseManager.badrequest({ message: "Tax with this name already exists" }, res);
                }

                const createdBy = req.token.adminId;
                const taxObj = {
                    tax_name: tax_name.trim(),
                    tax_type,
                    tax_rate: parseFloat(tax_rate),
                    applicable_on,
                    status: true,
                    admin_id: createdBy,
                    createdBy,
                    updatedBy: createdBy,
                    createdAtTimestamp: Date.now(),
                    updatedAtTimestamp: Date.now()
                };

                const newTax = await taxModel.create(taxObj);

                return responseManager.onSuccess("Tax added successfully", newTax, res);
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


/** =================== List Taxes =================== **/
exports.listTaxes = async (req, res) => {
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
                    query.tax_name = { $regex: new RegExp(search.trim(), "i") };
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

                const result = await taxModel.paginate(query, options);
                return responseManager.onSuccess("Taxes fetched successfully", result, res);

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
exports.getTaxById = async (req, res) => {
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
                    return responseManager.badrequest({ message: "Invalid Tax ID" }, res);
                }

                const tax = await taxModel.findById(id).lean();
                if (!tax) {
                    return responseManager.badrequest({ message: "Tax not found" }, res);
                }

                return responseManager.onSuccess("Tax fetched successfully", tax, res);
               
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
exports.updateTax = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);

            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                const { tax_name, tax_type, tax_rate, applicable_on } = req.body;

                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return responseManager.badrequest({ message: "Invalid Tax ID" }, res);
                }

                let updateObj = {};
                if (tax_name) updateObj.tax_name = tax_name.trim();
                if (tax_type) updateObj.tax_type = tax_type;
                if (tax_rate) updateObj.tax_rate = parseFloat(tax_rate);
                if (applicable_on) updateObj.applicable_on = applicable_on;
                updateObj.updatedAtTimestamp = Date.now();

                const updated = await taxModel.findByIdAndUpdate(id, updateObj, { new: true }).lean();

                return responseManager.onSuccess("Tax updated successfully", updated, res);
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
exports.deleteTax = async (req, res) => {
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
                    return responseManager.badrequest({ message: "Invalid Tax ID" }, res);
                }

                await taxModel.findByIdAndDelete(id);

                return responseManager.onSuccess("Tax deleted successfully", {}, res);
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
exports.toggleTaxStatus = async (req, res) => {
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
                    return responseManager.badrequest({ message: "Invalid Tax ID" }, res);
                }

                const tax = await taxModel.findById(id).lean();
                if (!tax) {
                    return responseManager.badrequest({ message: "Tax not found" }, res);
                }

                const updated = await taxModel.findByIdAndUpdate(
                    id,
                    { status: !tax.status, updatedAtTimestamp: Date.now() },
                    { new: true }
                ).lean();

                return responseManager.onSuccess("Tax status updated successfully", updated, res);
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
exports.exportTaxes = async (req, res) => {
    try {
        let { search = "", status, date } = req.query;

        let query = {};
        if (search && search.trim() !== "") {
            query.tax_name = { $regex: new RegExp(search.trim(), "i") };
        }
        if (status !== undefined) {
            query.status = status === "true";
        }
        if (date) {
            let start = new Date(date);
            start.setHours(0, 0, 0, 0);
            let end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        const taxes = await taxModel.find(query).lean();
        if (!taxes || taxes.length === 0) {
            return responseManager.badrequest({ message: "No data found to export" }, res);
        }

        const cleaned = taxes.map((t, i) => {
            const { _id, admin_id, createdBy, updatedBy, __v, createdAtTimestamp, updatedAtTimestamp, ...rest } = t;

            // ✅ Format date
            const createdAt = rest.createdAt ? new Date(rest.createdAt).toLocaleString("en-GB", { hour12: false }) : "";
            const updatedAt = rest.updatedAt ? new Date(rest.updatedAt).toLocaleString("en-GB", { hour12: false }) : "";

            return {
                "Sr No": i + 1,
                "Tax Name": rest.tax_name,
                "Tax Type": rest.tax_type,
                "Tax Rate": rest.tax_rate,
                "Applicable On": Array.isArray(rest.applicable_on) ? rest.applicable_on.join(", ") : "",
                "Status": rest.status ? "Active" : "Inactive",
                "Created At": createdAt,
                "Updated At": updatedAt
            };
        });

        const ws = XLSX.utils.json_to_sheet(cleaned);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Taxes");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Disposition", "attachment; filename=taxes.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        return res.send(buffer);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};


/** =================== Import =================== **/
exports.importTaxes = async (req, res) => {
    try {
        if (!req.file) {
            return responseManager.badrequest({ message: "Please upload a file" }, res);
        }

        // Read Excel
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!data || data.length === 0) {
            return responseManager.badrequest({ message: "File is empty or invalid" }, res);
        }

        const now = Date.now();
        const adminId = req?.token?.adminId || new mongoose.Types.ObjectId();

        // All existing tax names
        const existing = await taxModel.find({}, { tax_name: 1 }).lean();
        const existingNames = existing.map(v => v.tax_name.toLowerCase());

        // 🟢 Normalize Excel headers into schema fields
        const normalize = (item) => ({
            tax_name: item["Tax Name"],
            tax_type: item["Tax Type"],
            tax_rate: item["Tax Rate"],
            applicable_on: item["Applicable On"] 
                ? item["Applicable On"].split(",").map(v => v.trim()) 
                : [],
            status: item["Status"]?.toLowerCase() === "active", // true/false
        });

        // 🟢 Convert + filter only new taxes
        const newTaxes = data
            .map(normalize)
            .filter(item => item.tax_name && !existingNames.includes(item.tax_name.toLowerCase()))
            .map(item => ({
                ...item,
                createdBy: adminId,
                updatedBy: adminId,
                createdAtTimestamp: now,
                updatedAtTimestamp: now
            }));

        if (newTaxes.length === 0) {
            return responseManager.badrequest({ message: "All taxes already exist, nothing to import" }, res);
        }

        // Insert into DB
        const inserted = await taxModel.insertMany(newTaxes);
        const totalCount = await taxModel.countDocuments();

        return responseManager.onSuccess(
            `${inserted.length} taxes imported successfully. Total: ${totalCount}`,
            { inserted, totalCount },
            res
        );

    } catch (err) {
        return responseManager.onError(err, res);
    }
};

