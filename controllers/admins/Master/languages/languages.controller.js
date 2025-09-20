const responseManager = require("../../../../utilities/response.manager");
const mongoose = require("mongoose");
const languageModel = require("../../../../models/Admin/Master/language.model");
const mongoConnection = require('../../../../utilities/connections');
const constants = require('../../../../utilities/constants');
const config = require('../../../../utilities/config');
const adminsModel = require('../../../../models/admins.model');
const XLSX = require("xlsx");
exports.addLanguage = async (req, res) => {
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
                // let havepermission = await config.getPermission(adminData.roleid, 'vehiclestypes', 'insert');
                // if (havepermission) {
                const { name } = req.body;

                // ===== Name Validation =====
                if (!name || name.trim().length < 2) {
                    return responseManager.badrequest(
                        { message: "Language name must be at least 2 characters long" },
                        res
                    );
                }

                // ===== Duplicate Check =====
                const existingLanguage = await languageModel.findOne({
                    name: { $regex: new RegExp(`^${name.trim()}$`, "i") }
                }).lean();

                if (existingLanguage) {
                    return responseManager.badrequest(
                        { message: "Language with this name already exists" },
                        res
                    );
                }

                /** ===== Auto Assign Admin ===== **/
                const createdBy = req.token.adminId;
                const createdByType = "admin";


                // ===== Save Object =====
                const languageObj = {
                    name: name.trim(),
                    status: true,
                    admin_id: createdBy, // auto assign from token
                    createdBy,
                    updatedBy: createdBy,
                    createAtTimestamp: Date.now(),
                    updateAtTimestamp: Date.now()
                };


                const newLanguage = await languageModel.create(languageObj);

                // ===== Response =====
                return responseManager.onSuccess(
                    "Language added successfully",
                    {
                        ...newLanguage.toObject(),
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

exports.listLanguages = async (req, res) => {
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

                // 🔹 Search filter
                if (search && search.trim() !== "") {
                    query.name = { $regex: new RegExp(search.trim(), "i") };
                }

                // 🔹 Status filter
                if (status !== undefined) {
                    query.status = status === "true";
                }

                // 🔹 Date filter (createdAt) - single day
                if (date) {
                    let startOfDay = new Date(date);
                    startOfDay.setHours(0, 0, 0, 0);

                    let endOfDay = new Date(date);
                    endOfDay.setHours(23, 59, 59, 999);

                    query.createdAt = { $gte: startOfDay, $lte: endOfDay };
                }

                const options = {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    sort: { createdAt: -1 },
                    lean: true
                };

                const result = await languageModel.paginate(query, options);

                return responseManager.onSuccess("Languages fetched successfully", result, res);

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


exports.getLanguageById = async (req, res) => {
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
                    return responseManager.badrequest({ message: "Invalid Language ID" }, res);
                }

                const language = await languageModel.findById(id).lean();
                if (!language) {
                    return responseManager.badrequest({ message: "Langauge not found" }, res);
                }

                return responseManager.onSuccess("Language fetched successfully", language, res);
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


exports.updateLanguage = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                const { name } = req.body;

                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return responseManager.badrequest({ message: "Invalid Language ID" }, res);
                }

                if (!name || name.trim().length < 2) {
                    return responseManager.badrequest(
                        { message: "Language name must be at least 2 characters long" },
                        res
                    );
                }

                const updated = await languageModel.findByIdAndUpdate(
                    id,
                    {
                        name: name.trim(),
                        updatedBy: req.token.adminId,
                        updateAtTimestamp: Date.now()
                    },
                    { new: true }
                ).lean();

                if (!updated) {
                    return responseManager.badrequest({ message: "Language not found" }, res);
                }

                return responseManager.onSuccess("Language updated successfully", updated, res);
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


exports.deleteLangauge = async (req, res) => {
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
                    return responseManager.badrequest({ message: "Invalid Language ID" }, res);
                }

                const deleted = await languageModel.findByIdAndDelete(id).lean();

                if (!deleted) {
                    return responseManager.badrequest({ message: "Language not found" }, res);
                }

                return responseManager.onSuccess("Language deleted successfully", deleted, res);
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
exports.toggleLanguageStatus = async (req, res) => {
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
                    return responseManager.badrequest({ message: "Invalid Language ID" }, res);
                }

                const language = await languageModel.findById(id);
                if (!language) {
                    return responseManager.badrequest({ message: "Language not found" }, res);
                }

                language.status = !language.status;
                language.updatedBy = req.token.adminId;
                language.updateAtTimestamp = Date.now();
                await language.save();

                return responseManager.onSuccess(
                    "Language status toggled successfully",
                    language,
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
// ================= Export Languages =================
exports.exportLanguages = async (req, res) => {
    try {
        let { search = "", status, date } = req.query;

        // ===== Build query object =====
        let query = {};
        if (search && search.trim() !== "") {
            query.name = { $regex: new RegExp(search.trim(), "i") };
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
        const languages = await languageModel.find(query).lean();

        if (!languages || languages.length === 0) {
            return responseManager.badrequest({ message: "No data found to export" }, res);
        }

        // ===== Clean data + add Serial No =====
        const cleanedData = languages.map((item, index) => {
            const {
           
                admin_id,
                updatedBy,
                createdBy,
                createAtTimestamp,
                updateAtTimestamp,
                __v,
                updatedAtTimestamp,
                _id,
                ...rest
            } = item;

            return {
                "Sr No": index + 1,
                ...rest
            };
        });

        // ===== Convert JSON → Excel sheet =====
        const ws = XLSX.utils.json_to_sheet(cleanedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Languages");

        // ===== File buffer generate karo =====
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Disposition", "attachment; filename=languages.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        return res.send(buffer);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};

// ================= Import Languages =================
exports.importLanguages = async (req, res) => {
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

        // DB ma already existing names fetch karo
        const existingLanguages= await languageModel.find({}, { name: 1 }).lean();
        const existingNames = existingLanguages.map(f => f.name.toLowerCase());

        // File ma je nava che (duplicate avoid karva)
        const newLanguages = data
            .filter(item => item.name && !existingNames.includes(item.name.toLowerCase()))
            .map(item => ({
                ...item,
                createdBy: adminId,
                updatedBy: adminId,
                createAtTimestamp: now,
                updateAtTimestamp: now,
                status: true
            }));

        if (newLanguages.length === 0) {
            return responseManager.badrequest({ message: "All languages already exist, nothing new to import" }, res);
        }

        // DB ma insert karo
        const inserted = await languageModel.insertMany(newLanguages);

        // Total count fetch karo
        const totalCount = await languageModel.countDocuments();

        return responseManager.onSuccess(
            `${inserted.length} languages imported successfully. Total records now: ${totalCount}`,
            { inserted, totalCount },
            res
        );

    } catch (err) {
        return responseManager.onError(err, res);
    }
};
