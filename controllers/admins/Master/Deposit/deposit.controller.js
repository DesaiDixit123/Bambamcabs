const mongoose = require("mongoose");
const mongoConnection = require("../../../../utilities/connections");
const responseManager = require("../../../../utilities/response.manager");
const constants = require("../../../../utilities/constants");
const adminsModel = require("../../../../models/admins.model");
const depositModel = require("../../../../models/Admin/Master/deposite.model");
const XLSX = require("xlsx");

exports.addDeposit = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                const { vendorType, depositAmount, paymentModeAllowed } = req.body;

                // ✅ validation
                if (!vendorType || !["Individual Owner", "Company Owner"].includes(vendorType)) {
                    return responseManager.badrequest({ message: "Invalid vendorType" }, res);
                }
                if (!depositAmount || isNaN(depositAmount) || Number(depositAmount) <= 0) {
                    return responseManager.badrequest({ message: "Deposit amount must be greater than 0" }, res);
                }
                if (
                    paymentModeAllowed &&
                    (!Array.isArray(paymentModeAllowed) ||
                        paymentModeAllowed.some(
                            (mode) => !["UPI", "Net Banking", "Card", "Wallet"].includes(mode)
                        ))
                ) {
                    return responseManager.badrequest(
                        { message: "Invalid payment modes. Allowed: UPI, Net Banking, Card, Wallet" },
                        res
                    );
                }

                // ✅ object create
                const createdBy = req.token.adminId;
                const depositObj = {
                    vendorType,
                    adminId: createdBy,
                    depositAmount: Number(depositAmount),
                    paymentModeAllowed:
                        paymentModeAllowed && paymentModeAllowed.length > 0
                            ? paymentModeAllowed
                            : ["UPI", "Net Banking", "Card", "Wallet"],
                    status: true,
                    createdBy,
                    updatedBy: createdBy,
                    createdAtTimestamp: Date.now(),
                    updatedAtTimestamp: Date.now(),
                };

                // ✅ Direct model use
                const newDeposit = await depositModel.create(depositObj);

                return responseManager.onSuccess("Deposit added successfully", newDeposit, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) {
        return responseManager.onError(err, res);
    }
};


/** =================== List Deposits =================== **/
exports.listDeposits = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                let { page = 1, limit = 10, search = "", status, date } = req.query;
                let query = {};
                if (search && search.trim() !== "") query.vendorType = { $regex: new RegExp(search.trim(), "i") };
                if (status !== undefined) query.status = status === "true";
                if (date) {
                    let start = new Date(date); start.setHours(0, 0, 0, 0);
                    let end = new Date(date); end.setHours(23, 59, 59, 999);
                    query.createdAt = { $gte: start, $lte: end };
                }
                const options = { page: parseInt(page), limit: parseInt(limit), sort: { createdAt: -1 }, lean: true };
                const result = await depositModel.paginate(query, options);
                return responseManager.onSuccess("Deposits fetched successfully", result, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Get By ID =================== **/
exports.getDepositById = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);
                const deposit = await depositModel.findById(id).lean();
                if (!deposit) return responseManager.badrequest({ message: "Deposit not found" }, res);
                return responseManager.onSuccess("Deposit fetched successfully", deposit, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Update =================== **/
exports.updateDeposit = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                const { vendorType, depositAmount, paymentModeAllowed } = req.body;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);

                let updateObj = {};
                if (vendorType) updateObj.vendorType = vendorType;
                if (depositAmount) updateObj.depositAmount = Number(depositAmount);
                if (paymentModeAllowed) updateObj.paymentModeAllowed = paymentModeAllowed;
                updateObj.updatedAtTimestamp = Date.now();

                const updated = await depositModel.findByIdAndUpdate(id, updateObj, { new: true }).lean();
                return responseManager.onSuccess("Deposit updated successfully", updated, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Delete =================== **/
exports.deleteDeposit = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);
                await depositModel.findByIdAndDelete(id);
                return responseManager.onSuccess("Deposit deleted successfully", {}, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Toggle Status =================== **/
exports.toggleDepositStatus = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);
                const deposit = await depositModel.findById(id).lean();
                if (!deposit) return responseManager.badrequest({ message: "Deposit not found" }, res);

                const updated = await depositModel.findByIdAndUpdate(
                    id,
                    { status: !deposit.status, updatedAtTimestamp: Date.now() },
                    { new: true }
                ).lean();
                return responseManager.onSuccess("Deposit status updated successfully", updated, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Export =================== **/
exports.exportDeposits = async (req, res) => {
  try {
    let { search = "", status, date } = req.query;
    let query = {};

    if (search && search.trim() !== "")
      query.vendorType = { $regex: new RegExp(search.trim(), "i") };

    if (status !== undefined) query.status = status === "true";

    if (date) {
      let start = new Date(date);
      start.setHours(0, 0, 0, 0);
      let end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const deposits = await depositModel.find(query).lean();
    if (!deposits || deposits.length === 0)
      return responseManager.badrequest(
        { message: "No data found to export" },
        res
      );

    // ✅ clean + transform
    const cleaned = deposits.map((d, i) => {
      const {
        _id,
        adminId,
        createdBy,
        updatedBy,
        createdAtTimestamp,
        updatedAtTimestamp,
        __v,
        paymentModeAllowed,
        ...rest
      } = d;

      return {
        "Sr No": i + 1,
        ...rest,
        paymentModeAllowed: paymentModeAllowed
          ? paymentModeAllowed.join(", ")
          : "",
      };
    });

    // ✅ convert to Excel
    const ws = XLSX.utils.json_to_sheet(cleaned);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Deposits");
    const buffer = XLSX.write(wb, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=deposits.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    return res.send(buffer);
  } catch (err) {
    return responseManager.onError(err, res);
  }
};

/** =================== Import =================== **/
exports.importDeposits = async (req, res) => {
    try {
        if (!req.file) return responseManager.badrequest({ message: "Please upload a file" }, res);

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!data || data.length === 0) return responseManager.badrequest({ message: "File is empty or invalid" }, res);

        const now = Date.now();
        const adminId = req?.token?.adminId || new mongoose.Types.ObjectId();

        const existing = await depositModel.find({}, { vendorType: 1, depositAmount: 1 }).lean();

        const newDeposits = data.map(item => ({
            vendorType: item.vendorType,
            depositAmount: Number(item.depositAmount),
            paymentModeAllowed: item.paymentModeAllowed ? item.paymentModeAllowed.split(",") : ["UPI", "Net Banking", "Card", "Wallet"],
            createdBy: adminId,
            updatedBy: adminId,
            createdAtTimestamp: now,
            updatedAtTimestamp: now,
            status: true
        }));

        if (newDeposits.length === 0) return responseManager.badrequest({ message: "Nothing to import" }, res);

        const inserted = await depositModel.insertMany(newDeposits);
        const totalCount = await depositModel.countDocuments();

        return responseManager.onSuccess(
            `${inserted.length} deposits imported successfully. Total: ${totalCount}`,
            { inserted, totalCount },
            res
        );
    } catch (err) { return responseManager.onError(err, res); }
};
