const responseManager = require("../../../../utilities/response.manager");
const mongoose = require("mongoose");
const fuelTypeModel = require("../../../../models/Admin/Master/fuel_type.model");
const mongoConnection = require('../../../../utilities/connections');
const constants = require('../../../../utilities/constants');
const config = require('../../../../utilities/config');
const adminsModel = require('../../../../models/admins.model');
const XLSX = require("xlsx");
exports.addFuelType = async (req, res) => {
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
                        { message: "Fuel type name must be at least 2 characters long" },
                        res
                    );
                }

                // ===== Duplicate Check =====
                const existingFuelType = await fuelTypeModel.findOne({
                    name: { $regex: new RegExp(`^${name.trim()}$`, "i") }
                }).lean();

                if (existingFuelType) {
                    return responseManager.badrequest(
                        { message: "Fuel type with this name already exists" },
                        res
                    );
                }

                /** ===== Auto Assign Admin ===== **/
                const createdBy = req.token.adminId;
                const createdByType = "admin";


                // ===== Save Object =====
                const fuelTypeObj = {
                    name: name.trim(),
                    status: true,
                    vendor_id: null, // always null now
                    admin_id: createdBy, // auto assign from token
                    createdBy,
                    updatedBy: createdBy,
                    createAtTimestamp: Date.now(),
                    updateAtTimestamp: Date.now()
                };


                const newFuelType = await fuelTypeModel.create(fuelTypeObj);

                // ===== Response =====
                return responseManager.onSuccess(
                    "Fuel type added successfully",
                    {
                        ...newFuelType.toObject(),
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

exports.listFuelTypes = async (req, res) => {
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

                const result = await fuelTypeModel.paginate(query, options);

                return responseManager.onSuccess("Fuel types fetched successfully", result, res);

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


exports.getFuelTypeById = async (req, res) => {
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
                    return responseManager.badrequest({ message: "Invalid FuelType ID" }, res);
                }

                const fuelType = await fuelTypeModel.findById(id).lean();
                if (!fuelType) {
                    return responseManager.badrequest({ message: "Fuel type not found" }, res);
                }

                return responseManager.onSuccess("Fuel type fetched successfully", fuelType, res);
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


    exports.updateFuelType = async (req, res) => {
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
                    return responseManager.badrequest({ message: "Invalid FuelType ID" }, res);
                }

                if (!name || name.trim().length < 2) {
                    return responseManager.badrequest(
                        { message: "Fuel type name must be at least 2 characters long" },
                        res
                    );
                }

                const updated = await fuelTypeModel.findByIdAndUpdate(
                    id,
                    {
                        name: name.trim(),
                        updatedBy: req.token.adminId,
                        updateAtTimestamp: Date.now()
                    },
                    { new: true }
                ).lean();

                if (!updated) {
                    return responseManager.badrequest({ message: "Fuel type not found" }, res);
                }

                return responseManager.onSuccess("Fuel type updated successfully", updated, res);
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


exports.deleteFuelType = async (req, res) => {
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
                    return responseManager.badrequest({ message: "Invalid FuelType ID" }, res);
                }

                const deleted = await fuelTypeModel.findByIdAndDelete(id).lean();

                if (!deleted) {
                    return responseManager.badrequest({ message: "Fuel type not found" }, res);
                }

                return responseManager.onSuccess("Fuel type deleted successfully", deleted, res);
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
exports.toggleFuelTypeStatus = async (req, res) => {
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
                    return responseManager.badrequest({ message: "Invalid FuelType ID" }, res);
                }

                const fuelType = await fuelTypeModel.findById(id);
                if (!fuelType) {
                    return responseManager.badrequest({ message: "Fuel type not found" }, res);
                }

                fuelType.status = !fuelType.status;
                fuelType.updatedBy = req.token.adminId;
                fuelType.updateAtTimestamp = Date.now();
                await fuelType.save();

                return responseManager.onSuccess(
                    "Fuel type status toggled successfully",
                    fuelType,
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
// ================= Export FuelTypes =================
exports.exportFuelTypes = async (req, res) => {
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
        const fuelTypes = await fuelTypeModel.find(query).lean();

        if (!fuelTypes || fuelTypes.length === 0) {
            return responseManager.badrequest({ message: "No data found to export" }, res);
        }

        // ===== Clean data + add Serial No =====
        const cleanedData = fuelTypes.map((item, index) => {
            const {
                vendor_id,
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
        XLSX.utils.book_append_sheet(wb, ws, "FuelTypes");

        // ===== File buffer generate karo =====
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Disposition", "attachment; filename=fuel_types.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        return res.send(buffer);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};

// ================= Import FuelTypes =================
exports.importFuelTypes = async (req, res) => {
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
        const existingFuelTypes = await fuelTypeModel.find({}, { name: 1 }).lean();
        const existingNames = existingFuelTypes.map(f => f.name.toLowerCase());

        // File ma je nava che (duplicate avoid karva)
        const newFuelTypes = data
            .filter(item => item.name && !existingNames.includes(item.name.toLowerCase()))
            .map(item => ({
                ...item,
                createdBy: adminId,
                updatedBy: adminId,
                createAtTimestamp: now,
                updateAtTimestamp: now,
                status: true
            }));

        if (newFuelTypes.length === 0) {
            return responseManager.badrequest({ message: "All fuel types already exist, nothing new to import" }, res);
        }

        // DB ma insert karo
        const inserted = await fuelTypeModel.insertMany(newFuelTypes);

        // Total count fetch karo
        const totalCount = await fuelTypeModel.countDocuments();

        return responseManager.onSuccess(
            `${inserted.length} fuel types imported successfully. Total records now: ${totalCount}`,
            { inserted, totalCount },
            res
        );

    } catch (err) {
        return responseManager.onError(err, res);
    }
};
