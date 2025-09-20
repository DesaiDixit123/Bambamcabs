const mongoose = require("mongoose");
const mongoConnection = require("../../../../utilities/connections");
const responseManager = require("../../../../utilities/response.manager");
const constants = require("../../../../utilities/constants");
const adminsModel = require("../../../../models/admins.model");
const invoiceModel = require("../../../../models/Admin/Master/Invoice.model");
const XLSX = require("xlsx");
const AwsCloud = require("../../../../utilities/aws"); // 👈 ensure tamaru AWS upload utility import karyo

/** =================== Add Invoice =================== **/
exports.addInvoice = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                let { company_name, address, mobile_no, gst_no, applicable_on, terms_conditions } = req.body;

                if (!company_name || company_name.trim().length < 2) {
                    return responseManager.badrequest({ message: "Invalid company name" }, res);
                }
                if (!address || address.trim().length < 5) {
                    return responseManager.badrequest({ message: "Invalid address" }, res);
                }
                if (!/^[0-9]{10}$/.test(mobile_no)) {
                    return responseManager.badrequest({ message: "Invalid mobile number" }, res);
                }
                if (!terms_conditions || terms_conditions.trim().length < 5) {
                    return responseManager.badrequest({ message: "Invalid terms & conditions" }, res);
                }
                if (!Array.isArray(applicable_on) || applicable_on.length === 0) {
                    return responseManager.badrequest({ message: "Applicable_on is required" }, res);
                }

                // ===== Upload Logo if provided =====
                let logoFile = req.files && req.files.logo ? req.files.logo[0] : null;
                let logoUrl = "";
                if (logoFile) {
                    if (!["image/jpeg", "image/png", "image/jpg"].includes(logoFile.mimetype)) {
                        return responseManager.badrequest({ message: "Only JPG, PNG allowed for logo" }, res);
                    }
                    let filesizeinMb = parseFloat(logoFile.size / 1048576);
                    if (filesizeinMb > 5) {
                        return responseManager.badrequest({ message: "Logo must be <= 5 MB" }, res);
                    }
                    let uploadResult = await AwsCloud.saveToS3(
                        logoFile.buffer,
                        "invoices",
                        logoFile.mimetype,
                        "invoice_logo"
                    );
                    logoUrl = uploadResult.data.Key;
                }

                let invoiceObj = {
                    adminId: req.token.adminId,
                    company_name: company_name.trim(),
                    address: address.trim(),
                    mobile_no: mobile_no.trim(),
                    gst_no: gst_no ? gst_no.trim() : "",
                    applicable_on,
                    terms_conditions: terms_conditions.trim(),
                    logo: logoUrl,
                    status: true,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };

                let newInvoice = await invoiceModel.create(invoiceObj);
                return responseManager.onSuccess("Invoice added successfully", newInvoice, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== List Invoices =================== **/
exports.listInvoices = async (req, res) => {
    try {
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
                    query.company_name = { $regex: new RegExp(search.trim(), "i") };
                }
                if (status !== undefined) query.status = status === "true";
                if (date) {
                    let start = new Date(date); start.setHours(0, 0, 0, 0);
                    let end = new Date(date); end.setHours(23, 59, 59, 999);
                    query.createdAt = { $gte: start, $lte: end };
                }

                const options = { page: parseInt(page), limit: parseInt(limit), sort: { createdAt: -1 }, lean: true };
                const result = await invoiceModel.paginate(query, options);
                return responseManager.onSuccess("Invoices fetched successfully", result, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Get By ID =================== **/
exports.getInvoiceById = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);
                const invoice = await invoiceModel.findById(id).lean();
                if (!invoice) return responseManager.badrequest({ message: "Invoice not found" }, res);
                return responseManager.onSuccess("Invoice fetched successfully", invoice, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Update Invoice =================== **/
/** =================== Update Invoice =================== **/
exports.updateInvoice = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {


                const {id}=req.params
                const {  company_name, address, mobile_no, gst_no, applicable_on, terms_conditions } = req.body;

                if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                    return responseManager.badrequest({ message: "Invalid Invoice ID" }, res);
                }

                let updateObj = { updatedAt: Date.now() };

                if (company_name) updateObj.company_name = company_name.trim();
                if (address) updateObj.address = address.trim();
                if (mobile_no && /^[0-9]{10}$/.test(mobile_no)) updateObj.mobile_no = mobile_no.trim();
                if (gst_no) updateObj.gst_no = gst_no.trim();
                if (applicable_on && Array.isArray(applicable_on)) updateObj.applicable_on = applicable_on;
                if (terms_conditions) updateObj.terms_conditions = terms_conditions.trim();

                // ===== Logo Update =====
                let logoFile = req.files && req.files.logo ? req.files.logo[0] : null;
                if (logoFile) {
                    if (!["image/jpeg", "image/png", "image/jpg"].includes(logoFile.mimetype)) {
                        return responseManager.badrequest({ message: "Only JPG, PNG allowed for logo" }, res);
                    }
                    let uploadResult = await AwsCloud.saveToS3(
                        logoFile.buffer,
                        "invoices",
                        logoFile.mimetype,
                        "invoice_logo"
                    );
                    updateObj.logo = uploadResult.data.Key;
                }

                let updated = await invoiceModel.findByIdAndUpdate(id, updateObj, { new: true }).lean();
                return responseManager.onSuccess("Invoice updated successfully", updated, res);
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

/** =================== Delete Invoice =================== **/
exports.deleteInvoice = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);
                await invoiceModel.findByIdAndDelete(id);
                return responseManager.onSuccess("Invoice deleted successfully", {}, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Toggle Status =================== **/
exports.toggleInvoiceStatus = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);
                const invoice = await invoiceModel.findById(id).lean();
                if (!invoice) return responseManager.badrequest({ message: "Invoice not found" }, res);

                const updated = await invoiceModel.findByIdAndUpdate(
                    id,
                    { status: !invoice.status, updatedAt: Date.now() },
                    { new: true }
                ).lean();
                return responseManager.onSuccess("Invoice status updated successfully", updated, res);
                 } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
            } catch (err) { return responseManager.onError(err, res); }
        };

        /** =================== Export Invoices =================== **/
        exports.exportInvoices = async (req, res) => {
            try {
                let { search = "", status, date } = req.query;
                let query = {};
                if (search && search.trim() !== "") query.company_name = { $regex: new RegExp(search.trim(), "i") };
                if (status !== undefined) query.status = status === "true";
                if (date) {
                    let start = new Date(date); start.setHours(0, 0, 0, 0);
                    let end = new Date(date); end.setHours(23, 59, 59, 999);
                    query.createdAt = { $gte: start, $lte: end };
                }

                const invoices = await invoiceModel.find(query).lean();
                if (!invoices || invoices.length === 0) return responseManager.badrequest({ message: "No data found to export" }, res);

                const cleaned = invoices.map((b, i) => {
                    const { adminId, __v, ...rest } = b;
                    return {
                        "Sr No": i + 1,
                        ...rest,
                        applicable_on: Array.isArray(b.applicable_on) ? b.applicable_on.join(", ") : ""
                    };
                });

                const ws = XLSX.utils.json_to_sheet(cleaned);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Invoices");
                const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

                res.setHeader("Content-Disposition", "attachment; filename=invoices.xlsx");
                res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                return res.send(buffer);
            } catch (err) { return responseManager.onError(err, res); }
        };

        /** =================== Import Invoices =================== **/
        exports.importInvoices = async (req, res) => {
            try {
                if (!req.file) return responseManager.badrequest({ message: "Please upload a file" }, res);

                const workbook = XLSX.readFile(req.file.path);
                const sheetName = workbook.SheetNames[0];
                const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

                if (!data || data.length === 0) return responseManager.badrequest({ message: "File is empty or invalid" }, res);

                const now = Date.now();
                const adminId = req?.token?.adminId || new mongoose.Types.ObjectId();

                const newInvoices = data.map(item => ({
                    company_name: item.company_name,
                    address: item.address,
                    mobile_no: item.mobile_no,
                    gst_no: item.gst_no || "",
                    applicable_on: item.applicable_on ? item.applicable_on.split(",").map(v => v.trim()) : [],
                    terms_conditions: item.terms_conditions,
                    logo: item.logo || "",
                    createdBy: adminId,
                    updatedBy: adminId,
                    createdAt: now,
                    updatedAt: now,
                    status: true
                }));

                if (newInvoices.length === 0) return responseManager.badrequest({ message: "Nothing to import" }, res);

                const inserted = await invoiceModel.insertMany(newInvoices);
                const totalCount = await invoiceModel.countDocuments();

                return responseManager.onSuccess(
                    `${inserted.length} invoices imported successfully. Total: ${totalCount}`,
                    { inserted, totalCount },
                    res
                );
            } catch (err) { return responseManager.onError(err, res); }
        };
