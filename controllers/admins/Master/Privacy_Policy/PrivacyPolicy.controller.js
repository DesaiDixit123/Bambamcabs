const mongoose = require("mongoose");
const mongoConnection = require("../../../../utilities/connections");
const responseManager = require("../../../../utilities/response.manager");
const constants = require("../../../../utilities/constants");
const adminsModel = require("../../../../models/admins.model");
const privacyPolicyModel = require("../../../../models/Admin/Master/PrivacyModel.model");
const XLSX = require("xlsx");

/** =================== Add Policy =================== **/
exports.addPolicy = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                let { policy_name, applicable_on, policy_description } = req.body;

                if (!policy_name || policy_name.trim().length < 3) {
                    return responseManager.badrequest({ message: "Invalid policy name" }, res);
                }
                if (!Array.isArray(applicable_on) || applicable_on.length === 0) {
                    return responseManager.badrequest({ message: "Applicable on is required" }, res);
                }
                if (!policy_description || policy_description.trim().length < 10) {
                    return responseManager.badrequest({ message: "Policy description must be at least 10 chars" }, res);
                }
                const createdBy = req.token.adminId;
                let policyObj = {
                    adminId: createdBy,
                    createdBy,
                    updatedBy: createdBy,
                    policy_name: policy_name.trim(),
                    applicable_on,
                    policy_description: policy_description.trim(),
                    status: true,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };

                let newPolicy = await privacyPolicyModel.create(policyObj);
                return responseManager.onSuccess("Privacy Policy added successfully", newPolicy, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== List Policies =================== **/
exports.listPolicies = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                let { page = 1, limit = 10, search = "", status, date } = req.query;
                let query = {};

                if (search && search.trim() !== "") query.policy_name = { $regex: new RegExp(search.trim(), "i") };
                if (status !== undefined) query.status = status === "true";
                if (date) {
                    let start = new Date(date); start.setHours(0, 0, 0, 0);
                    let end = new Date(date); end.setHours(23, 59, 59, 999);
                    query.createdAt = { $gte: start, $lte: end };
                }

                const options = { page: parseInt(page), limit: parseInt(limit), sort: { createdAt: -1 }, lean: true };
                const result = await privacyPolicyModel.paginate(query, options);
                return responseManager.onSuccess("Privacy Policies fetched successfully", result, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Get By ID =================== **/
exports.getPolicyById = async (req, res) => {
    try {

        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);

                const policy = await privacyPolicyModel.findById(id).lean();
                if (!policy) return responseManager.badrequest({ message: "Policy not found" }, res);
                return responseManager.onSuccess("Policy fetched successfully", policy, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Update Policy =================== **/
exports.updatePolicy = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                let { policy_name, applicable_on, policy_description, adminId } = req.body;

                if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                    return responseManager.badrequest({ message: "Invalid policy id" }, res);
                }

                let updateObj = { updatedAt: Date.now() };
                if (policy_name) updateObj.policy_name = policy_name.trim();
                if (Array.isArray(applicable_on) && applicable_on.length > 0) updateObj.applicable_on = applicable_on;
                if (policy_description) updateObj.policy_description = policy_description.trim();
                if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
                    updateObj.adminId = new mongoose.Types.ObjectId(adminId);
                }

                let updatedPolicy = await privacyPolicyModel.findByIdAndUpdate(
                    id,
                    updateObj,
                    { new: true }
                ).lean();

                return responseManager.onSuccess("Policy updated successfully", updatedPolicy, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) {
        return responseManager.onError(err, res);
    }
};


/** =================== Delete Policy =================== **/
exports.deletePolicy = async (req, res) => {
    try {


        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);

                await privacyPolicyModel.findByIdAndDelete(id);
                return responseManager.onSuccess("Policy deleted successfully", {}, res);

            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Toggle Status =================== **/
exports.togglePolicyStatus = async (req, res) => {
    try {

        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);

                const policy = await privacyPolicyModel.findById(id).lean();
                if (!policy) return responseManager.badrequest({ message: "Policy not found" }, res);

                const updated = await privacyPolicyModel.findByIdAndUpdate(
                    id,
                    { status: !policy.status, updatedAt: Date.now() },
                    { new: true }
                ).lean();
                return responseManager.onSuccess("Policy status updated successfully", updated, res);

                 } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);


            } catch (err) { return responseManager.onError(err, res); }
        };

        /** =================== Export Policies =================== **/
   exports.exportPolicies = async (req, res) => {
    try {
        let { search = "", status, date } = req.query;
        let query = {};

        if (search && search.trim() !== "") {
            query.policy_name = { $regex: new RegExp(search.trim(), "i") };
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

        const policies = await privacyPolicyModel.find(query).lean();
        if (!policies || policies.length === 0) {
            return responseManager.badrequest({ message: "No data found to export" }, res);
        }

        const cleaned = policies.map((p, i) => {
            // remove unwanted fields
            const { _id, adminId, createdBy, updatedBy, __v, ...rest } = p;

            // format dates
            const createdAt = p.createdAt
                ? new Date(p.createdAt).toLocaleString("en-GB", { hour12: false })
                : "";
            const updatedAt = p.updatedAt
                ? new Date(p.updatedAt).toLocaleString("en-GB", { hour12: false })
                : "";

            // convert array to CSV string
            const applicable_on = Array.isArray(p.applicable_on)
                ? p.applicable_on.join(", ")
                : p.applicable_on || "";

            return {
                "Sr No": i + 1,
                policy_name: p.policy_name,
                applicable_on,
                policy_description: p.policy_description,
                status: p.status ? "Active" : "Inactive",
                createdAt,
                updatedAt,
                ...rest
            };
        });

        const ws = XLSX.utils.json_to_sheet(cleaned);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Policies");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Disposition", "attachment; filename=privacy_policies.xlsx");
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        return res.send(buffer);
    } catch (err) {
        return responseManager.onError(err, res);
    }
};

        /** =================== Import Policies =================== **/
        exports.importPolicies = async (req, res) => {
            try {
                if (!req.file) return responseManager.badrequest({ message: "Please upload a file" }, res);

                const workbook = XLSX.readFile(req.file.path);
                const sheetName = workbook.SheetNames[0];
                const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

                if (!data || data.length === 0) return responseManager.badrequest({ message: "File is empty or invalid" }, res);

                const now = Date.now();
                const adminId = req?.token?.adminId || new mongoose.Types.ObjectId();

                const newPolicies = data.map(item => ({
                    policy_name: item.policy_name,
                    applicable_on: Array.isArray(item.applicable_on) ? item.applicable_on : [item.applicable_on],
                    policy_description: item.policy_description,
                    createdAt: now,
                    updatedAt: now,
                    adminId,
                    status: true
                }));

                if (newPolicies.length === 0) return responseManager.badrequest({ message: "Nothing to import" }, res);

                const inserted = await privacyPolicyModel.insertMany(newPolicies);
                const totalCount = await privacyPolicyModel.countDocuments();

                return responseManager.onSuccess(
                    `${inserted.length} policies imported successfully. Total: ${totalCount}`,
                    { inserted, totalCount },
                    res
                );
            } catch (err) { return responseManager.onError(err, res); }
        };
