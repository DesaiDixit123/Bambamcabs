const responseManager = require("../../../../utilities/response.manager");
const mongoose = require("mongoose");
const penaltyModel = require("../../../../models/Admin/Master/panelties.model");
const mongoConnection = require('../../../../utilities/connections');
const constants = require('../../../../utilities/constants');
const config = require('../../../../utilities/config');
const adminsModel = require('../../../../models/admins.model');
const XLSX = require("xlsx");

exports.addPenalty = async (req, res) => {
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
                // let havepermission = await config.getPermission(adminData.roleid, 'penalties', 'insert');
                // if (havepermission) {
                const { amount, category, description, applicable_on } = req.body;

                /** ===== Validation ===== **/
                if (!amount || isNaN(amount) || amount <= 0) {
                    return responseManager.badrequest(
                        { message: "Penalty amount must be a positive number" },
                        res
                    );
                }

                if (!category || category.trim().length < 2) {
                    return responseManager.badrequest(
                        { message: "Category must be at least 2 characters long" },
                        res
                    );
                }

                if (!description || description.trim().length < 5) {
                    return responseManager.badrequest(
                        { message: "Description must be at least 5 characters long" },
                        res
                    );
                }

                if (!applicable_on || !Array.isArray(applicable_on) || applicable_on.length === 0) {
                    return responseManager.badrequest(
                        { message: "Applicable On must be a non-empty array" },
                        res
                    );
                }

                /** ===== Duplicate Check (Category + Description) ===== **/
                const existingPenalty = await penaltyModel.findOne({
                    category: { $regex: new RegExp(`^${category.trim()}$`, "i") },
                    description: { $regex: new RegExp(`^${description.trim()}$`, "i") }
                }).lean();

                if (existingPenalty) {
                    return responseManager.badrequest(
                        { message: "Penalty with same category and description already exists" },
                        res
                    );
                }

                /** ===== Auto Assign Admin ===== **/
                const createdBy = req.token.adminId;
                const createdByType = "admin";

                /** ===== Save Object ===== **/
                const penaltyObj = {
                    amount: Number(amount),
                    category: category.trim(),
                    description: description.trim(),
                    applicable_on,
                    status: true,
                    admin_id: createdBy,
                    createdBy,
                    updatedBy: createdBy,
                    createAtTimestamp: Date.now(),
                    updateAtTimestamp: Date.now()
                };

                const newPenalty = await penaltyModel.create(penaltyObj);

                /** ===== Response ===== **/
                return responseManager.onSuccess(
                    "Penalty added successfully",
                    {
                        ...newPenalty.toObject(),
                        createdByType,
                        createdById: createdBy
                    },
                    res
                );

                // } else {
                //     return responseManager.accessDenied(res);
                // }
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


exports.listPenalty = async (req, res) => {
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

                page = parseInt(page);
                limit = parseInt(limit);

                let query = {};

                /** 🔎 Search in multiple fields **/
                if (search && search.trim() !== "") {
                    query.$or = [
                        { category: { $regex: new RegExp(search.trim(), "i") } },
                        { description: { $regex: new RegExp(search.trim(), "i") } },
                        { applicable_on: { $regex: new RegExp(search.trim(), "i") } },
                        !isNaN(search) ? { amount: Number(search) } : null
                    ].filter(Boolean);
                }

                /** ✅ Status filter (true/false) **/
                if (status !== undefined) {
                    if (status === "true" || status === "false") {
                        query.status = status === "true";
                    }
                }

                /** 📅 Single Date filter **/
                if (date) {
                    let startOfDay = new Date(date);
                    startOfDay.setHours(0, 0, 0, 0);

                    let endOfDay = new Date(date);
                    endOfDay.setHours(23, 59, 59, 999);

                    query.createAtTimestamp = {
                        $gte: startOfDay.getTime(),
                        $lte: endOfDay.getTime()
                    };
                }

                const options = {
                    page,
                    limit,
                    sort: { createdAt: -1 },
                    lean: true
                };

                const penalties = await penaltyModel.paginate(query, options);

                return responseManager.onSuccess("Penalty list fetched", penalties, res);
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


exports.getPenaltyById = async (req, res) => {
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
                    return responseManager.badrequest({ message: "Invalid Penalty ID" }, res);
                }

                const penalty = await penaltyModel.findById(id).lean();
                if (!penalty) {
                    return responseManager.badrequest({ message: "Penalty not found" }, res);
                }

                return responseManager.onSuccess("Penalty fetched successfully", penalty, res);
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

exports.updatePenalty = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                const { amount, category, description, applicable_on } = req.body;

                /** 🔎 ID validate **/
                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return responseManager.badrequest({ message: "Invalid Penalty ID" }, res);
                }

                /** 🔎 Validations **/
                if (!amount || isNaN(amount) || amount <= 0) {
                    return responseManager.badrequest(
                        { message: "Penalty amount must be a positive number" },
                        res
                    );
                }

                if (!category || category.trim().length < 2) {
                    return responseManager.badrequest(
                        { message: "Category must be at least 2 characters long" },
                        res
                    );
                }

                if (!description || description.trim().length < 5) {
                    return responseManager.badrequest(
                        { message: "Description must be at least 5 characters long" },
                        res
                    );
                }

                if (!applicable_on || !Array.isArray(applicable_on) || applicable_on.length === 0) {
                    return responseManager.badrequest(
                        { message: "Applicable On must be a non-empty array" },
                        res
                    );
                }

                /** 🔄 Update Penalty **/
                const updated = await penaltyModel.findByIdAndUpdate(
                    id,
                    {
                        amount: Number(amount),
                        category: category.trim(),
                        description: description.trim(),
                        applicable_on,
                        updatedBy: req.token.adminId,
                        updateAtTimestamp: Date.now()
                    },
                    { new: true }
                ).lean();

                if (!updated) {
                    return responseManager.badrequest({ message: "Penalty not found" }, res);
                }

                return responseManager.onSuccess("Penalty updated successfully", updated, res);
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



exports.deletePenalty = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;

                /** 🔎 Validate ID **/
                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return responseManager.badrequest({ message: "Invalid Penalty ID" }, res);
                }

                /** 🗑️ Delete Penalty **/
                const deleted = await penaltyModel.findByIdAndDelete(id).lean();

                if (!deleted) {
                    return responseManager.badrequest({ message: "Penalty not found" }, res);
                }

                return responseManager.onSuccess("Penalty deleted successfully", deleted, res);
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


exports.togglePenaltyStatus = async (req, res) => {
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
                    return responseManager.badrequest({ message: "Invalid Penalty ID" }, res);
                }

                const penalty = await penaltyModel.findById(id);
                if (!penalty) {
                    return responseManager.badrequest({ message: "Penalty not found" }, res);
                }

                penalty.status = !penalty.status;
                penalty.updatedBy = req.token.adminId;
                penalty.updateAtTimestamp = Date.now();
                await penalty.save();

                return responseManager.onSuccess(
                    "Penalty status toggled successfully",
                    penalty,
                    res
                );
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


// ================= Export Penalties =================
exports.exportPenalties = async (req, res) => {
    try {
        let { search = "", status, date } = req.query;

        // ===== Build query object =====
        let query = {};
        if (search && search.trim() !== "") {
            query.$or = [
                { category: { $regex: new RegExp(search.trim(), "i") } },
                { description: { $regex: new RegExp(search.trim(), "i") } },
                { applicable_on: { $regex: new RegExp(search.trim(), "i") } },
                { amount: isNaN(search) ? undefined : Number(search) }
            ].filter(Boolean);
        }

        if (status !== undefined) {
            query.status = status === "true";
        }

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }

        // ===== Fetch filtered data =====
        const penalties = await penaltyModel.find(query).lean();

        if (!penalties || penalties.length === 0) {
            return responseManager.badrequest({ message: "No data found to export" }, res);
        }

        // ===== Clean data + add Serial No =====
        const cleanedData = penalties.map((item, index) => {
            const {
                admin_id,
                updatedBy,
                createdBy,
                createAtTimestamp,
                updateAtTimestamp,
                __v,
                _id,
                ...rest
            } = item;

            return {
                "Sr No": index + 1,
                ...rest,
                // Convert applicable_on array → comma separated string
                applicable_on: Array.isArray(item.applicable_on) && item.applicable_on.length > 0
                    ? item.applicable_on.join(", ")
                    : ""
            };
        });

        // ===== Convert JSON → Excel sheet =====
        const ws = XLSX.utils.json_to_sheet(cleanedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Penalties");

        // ===== File buffer generate karo =====
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Disposition", "attachment; filename=penalties.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        return res.send(buffer);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};


// ================= Import Penalties =================
exports.importPenalties = async (req, res) => {
    try {
        if (!req.file) {
            return responseManager.badrequest({ message: "Please upload a file" }, res);
        }

        // File read karo
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!data || data.length === 0) {
            return responseManager.badrequest({ message: "File is empty or invalid" }, res);
        }

        // Default values add karo
        const now = Date.now();
        const adminId = req?.token?.adminId || new mongoose.Types.ObjectId();

        // DB ma already existing penalties fetch karo
        const existingPenalties = await penaltyModel.find({}, { category: 1, description: 1 }).lean();
        const existingCombos = existingPenalties.map(
            f => `${f.category.toLowerCase()}_${f.description.toLowerCase()}`
        );

        // File ma je nava che (duplicate avoid karva)
        const newPenalties = data
            .filter(item =>
                item.category &&
                item.description &&
                !existingCombos.includes(`${item.category.toLowerCase()}_${item.description.toLowerCase()}`)
            )
            .map(item => ({
                amount: Number(item.amount) || 0,
                category: item.category?.trim(),
                description: item.description?.trim(),
                applicable_on: Array.isArray(item.applicable_on)
                    ? item.applicable_on
                    : (item.applicable_on ? [item.applicable_on] : []),
                createdBy: adminId,
                updatedBy: adminId,
                createAtTimestamp: now,
                updateAtTimestamp: now,
                status: true
            }));

        if (newPenalties.length === 0) {
            return responseManager.badrequest({ message: "All penalties already exist, nothing new to import" }, res);
        }

        // DB ma insert karo
        const inserted = await penaltyModel.insertMany(newPenalties);

        // Total count fetch karo
        const totalCount = await penaltyModel.countDocuments();

        return responseManager.onSuccess(
            `${inserted.length} penalties imported successfully. Total records now: ${totalCount}`,
            { inserted, totalCount },
            res
        );

    } catch (err) {
        return responseManager.onError(err, res);
    }
};
