const responseManager = require("../../../../utilities/response.manager");
const mongoose = require("mongoose");
const paymentModel = require("../../../../models/Admin/Master/Invoice.model");
const mongoConnection = require('../../../../utilities/connections');
const constants = require('../../../../utilities/constants');
const adminsModel = require('../../../../models/admins.model');
const XLSX = require("xlsx");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

/** =================== Add Payment =================== **/
exports.addPayment = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                const { payment_name, advance_payment_percentage, applicable_on } = req.body;

                if (!payment_name || payment_name.trim().length < 2) {
                    return responseManager.badrequest({ message: "Payment name must be at least 2 characters long" }, res);
                }
                if (![0, 25, 50, 75, 100].includes(Number(advance_payment_percentage))) {
                    return responseManager.badrequest({ message: "Invalid advance payment percentage" }, res);
                }
                if (!applicable_on || !Array.isArray(applicable_on) || applicable_on.length === 0) {
                    return responseManager.badrequest({ message: "Applicable On is required" }, res);
                }

                const existing = await paymentModel.findOne({
                    payment_name: { $regex: new RegExp(`^${payment_name.trim()}$`, "i") }
                }).lean();
                if (existing) {
                    return responseManager.badrequest({ message: "Payment with this name already exists" }, res);
                }

                const createdBy = req.token.adminId;
                const paymentObj = {
                    payment_name: payment_name.trim(),
                    advance_payment_percentage: Number(advance_payment_percentage),
                    applicable_on,
                    status: true,
                    admin_id: createdBy,
                    createdBy,
                    updatedBy: createdBy,
                    createdAtTimestamp: Date.now(),
                    updatedAtTimestamp: Date.now()
                };

                const newPayment = await paymentModel.create(paymentObj);
                return responseManager.onSuccess("Payment added successfully", newPayment, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) {
        return responseManager.onError(err, res);
    }
};

/** =================== List Payments =================== **/
exports.listPayments = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                let { page = 1, limit = 10, search = "", status, date } = req.query;
                let query = {};
                if (search && search.trim() !== "") query.payment_name = { $regex: new RegExp(search.trim(), "i") };
                if (status !== undefined) query.status = status === "true";
                if (date) {
                    let start = new Date(date); start.setHours(0, 0, 0, 0);
                    let end = new Date(date); end.setHours(23, 59, 59, 999);
                    query.createdAt = { $gte: start, $lte: end };
                }
                const options = { page: parseInt(page), limit: parseInt(limit), sort: { createdAt: -1 }, lean: true };
                const result = await paymentModel.paginate(query, options);
                return responseManager.onSuccess("Payments fetched successfully", result, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Get By ID =================== **/
exports.getPaymentById = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);
                const payment = await paymentModel.findById(id).lean();
                if (!payment) return responseManager.badrequest({ message: "Payment not found" }, res);
                return responseManager.onSuccess("Payment fetched successfully", payment, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Update =================== **/
exports.updatePayment = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                const { payment_name, advance_payment_percentage, applicable_on } = req.body;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);

                let updateObj = {};
                if (payment_name) updateObj.payment_name = payment_name.trim();
                if (advance_payment_percentage) updateObj.advance_payment_percentage = Number(advance_payment_percentage);
                if (applicable_on) updateObj.applicable_on = applicable_on;
                updateObj.updatedAtTimestamp = Date.now();

                const updated = await paymentModel.findByIdAndUpdate(id, updateObj, { new: true }).lean();
                return responseManager.onSuccess("Payment updated successfully", updated, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Delete =================== **/
exports.deletePayment = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);
                await paymentModel.findByIdAndDelete(id);
                return responseManager.onSuccess("Payment deleted successfully", {}, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Toggle Status =================== **/
exports.togglePaymentStatus = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);
                const payment = await paymentModel.findById(id).lean();
                if (!payment) return responseManager.badrequest({ message: "Payment not found" }, res);

                const updated = await paymentModel.findByIdAndUpdate(
                    id,
                    { status: !payment.status, updatedAtTimestamp: Date.now() },
                    { new: true }
                ).lean();
                return responseManager.onSuccess("Payment status updated successfully", updated, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Export =================== **/
exports.exportPayments = async (req, res) => {
    try {
        let { search = "", status, date } = req.query;
        let query = {};

        // 🔍 Search filter
        if (search && search.trim() !== "") {
            query.payment_name = { $regex: new RegExp(search.trim(), "i") };
        }

        // ✅ Status filter
        if (status !== undefined) {
            query.status = status === "true";
        }

        // 📅 Date filter
        if (date) {
            let start = new Date(date);
            start.setHours(0, 0, 0, 0);
            let end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        const payments = await paymentModel.find(query).lean();
        if (!payments || payments.length === 0) {
            return responseManager.badrequest({ message: "No data found to export" }, res);
        }

        const cleaned = payments.map((p, i) => {
            // Remove unwanted fields
            const { _id, createdAtTimestamp, updatedAtTimestamp, admin_id, createdBy, updatedBy, __v, ...rest } = p;

            // Convert applicable_on array → comma separated string
            if (Array.isArray(rest.applicable_on)) {
                rest.applicable_on = rest.applicable_on.join(", ");
            }

            return { "Sr No": i + 1, ...rest };
        });

        // 📊 Convert JSON → Excel
        const ws = XLSX.utils.json_to_sheet(cleaned);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payments");

        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        // 📂 Send as download
        res.setHeader("Content-Disposition", "attachment; filename=payments.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buffer);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};


/** =================== Import =================== **/
exports.importPayments = async (req, res) => {
    try {
        if (!req.file) return responseManager.badrequest({ message: "Please upload a file" }, res);

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!data || data.length === 0) return responseManager.badrequest({ message: "File is empty or invalid" }, res);

        const now = Date.now();
        const adminId = req?.token?.adminId || new mongoose.Types.ObjectId();

        const existing = await paymentModel.find({}, { payment_name: 1 }).lean();
        const existingNames = existing.map(v => v.payment_name.toLowerCase());

        const newPayments = data
            .filter(item => item.payment_name && !existingNames.includes(item.payment_name.toLowerCase()))
            .map(item => ({
                ...item,
                createdBy: adminId,
                updatedBy: adminId,
                createdAtTimestamp: now,
                updatedAtTimestamp: now,
                status: true
            }));

        if (newPayments.length === 0) return responseManager.badrequest({ message: "All payments already exist, nothing to import" }, res);

        const inserted = await paymentModel.insertMany(newPayments);
        const totalCount = await paymentModel.countDocuments();

        return responseManager.onSuccess(
            `${inserted.length} payments imported successfully. Total: ${totalCount}`,
            { inserted, totalCount },
            res
        );
    } catch (err) { return responseManager.onError(err, res); }
};
