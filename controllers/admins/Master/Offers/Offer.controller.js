const mongoose = require("mongoose");
const mongoConnection = require("../../../../utilities/connections");
const responseManager = require("../../../../utilities/response.manager");
const constants = require("../../../../utilities/constants");
const adminsModel = require("../../../../models/admins.model");
const offerModel = require("../../../../models/Admin/Master/Offer.model");
const vehicleTypesModel = require("../../../../models/Admin/Master/vehiclestypes.model")
const XLSX = require("xlsx");

/** =================== Add Offer =================== **/
exports.addOffer = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(req.token.adminId).lean();

            if (adminData && adminData.status === true) {
                let {
                    offer_name, offer_code, discount_value, discount_type,
                    start_datetime, end_datetime, applicable_users,
                    description, vehicle_id, city_location_restriction
                } = req.body;

                if (!offer_name || offer_name.trim().length < 3) {
                    return responseManager.badrequest({ message: "Invalid offer name" }, res);
                }
                if (!offer_code || offer_code.trim().length < 3) {
                    return responseManager.badrequest({ message: "Invalid offer code" }, res);
                }
                if (!discount_value || isNaN(discount_value)) {
                    return responseManager.badrequest({ message: "Invalid discount value" }, res);
                }
                if (!["%", "₹"].includes(discount_type)) {
                    return responseManager.badrequest({ message: "Invalid discount type" }, res);
                }
                if (!start_datetime || !end_datetime) {
                    return responseManager.badrequest({ message: "Start & End date required" }, res);
                }
                if (!["All Users", "New Users Only", "Vendors"].includes(applicable_users)) {
                    return responseManager.badrequest({ message: "Invalid applicable users" }, res);
                }

                let offerObj = {
                    admin_id: req.token.adminId,
                    offer_name: offer_name.trim(),
                    offer_code: offer_code.trim(),
                    discount_value,
                    discount_type,
                    start_datetime,
                    end_datetime,
                    applicable_users,
                    description: description || "",
                    vehicle_id: vehicle_id || [],
                    city_location_restriction: city_location_restriction || [],
                    createdBy: req.token.adminId,
                    updatedBy: req.token.adminId,
                    createdAtTimestamp: Date.now(),
                    updatedAtTimestamp: Date.now(),
                    status: true
                };

                let newOffer = await offerModel.create(offerObj);
                return responseManager.onSuccess("Offer added successfully", newOffer, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== List Offers =================== **/
exports.listOffers = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(req.token.adminId).lean();


            if (adminData && adminData.status === true) {
                let { page = 1, limit = 10, search = "", status } = req.query;
                let query = {};
                if (search && search.trim() !== "") {
                    query.offer_name = { $regex: new RegExp(search.trim(), "i") };
                }
                if (status !== undefined) {
                    query.status = status === "true";
                }

                const options = {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    sort: { createdAt: -1 },
                    lean: true
                };

                const result = await offerModel.paginate(query, options);

                if (result && result.docs && result.docs.length > 0) {
                    for (let offer of result.docs) {
                        if (offer.vehicle_id && offer.vehicle_id.length > 0) {
                            let vehicles = await vehicleTypesModel.find({
                                _id: { $in: offer.vehicle_id }
                            }).lean();

                            // vehicle data add
                            offer.vehicle_data = vehicles;
                        } else {
                            offer.vehicle_data = [];
                        }
                    }
                }

                return responseManager.onSuccess("Offers fetched successfully", result, res);
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
exports.getOfferById = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
         let primary = mongoConnection.useDb(constants.DEFAULT_DB);
         let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(req.token.adminId).lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return responseManager.badrequest({ message: "Invalid ID" }, res);
                }

                let offer = await offerModel.findById(id).lean();
                if (!offer) {
                    return responseManager.badrequest({ message: "Offer not found" }, res);
                }

                // vehicleTypes data add karvu
                if (offer.vehicle_id && offer.vehicle_id.length > 0) {
                    let vehicles = await vehicleTypesModel.find({
                        _id: { $in: offer.vehicle_id }
                    }).lean();

                    offer.vehicle_data = vehicles;
                } else {
                    offer.vehicle_data = [];
                }

                return responseManager.onSuccess("Offer fetched successfully", offer, res);
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

/** =================== Update Offer =================== **/
exports.updateOffer = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(req.token.adminId).lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                    return responseManager.badrequest({ message: "Invalid offer id" }, res);
                }

                let updateObj = {
                    updatedBy: req.token.adminId,
                    updatedAtTimestamp: Date.now()
                };

                let fields = ["offer_name", "offer_code", "discount_value", "discount_type", "start_datetime", "end_datetime", "applicable_users", "description", "vehicle_id", "city_location_restriction"];
                fields.forEach(field => {
                    if (req.body[field] !== undefined) updateObj[field] = req.body[field];
                });

                let updatedOffer = await offerModel.findByIdAndUpdate(id, updateObj, { new: true }).lean();
                return responseManager.onSuccess("Offer updated successfully", updatedOffer, res);

            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Delete Offer =================== **/
exports.deleteOffer = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(req.token.adminId).lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);
                await offerModel.findByIdAndDelete(id);
                return responseManager.onSuccess("Offer deleted successfully", {}, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Toggle Status =================== **/
exports.toggleOfferStatus = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel)
                .findById(req.token.adminId).lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);
                const offer = await offerModel.findById(id).lean();
                if (!offer) return responseManager.badrequest({ message: "Offer not found" }, res);

                const updated = await offerModel.findByIdAndUpdate(
                    id,
                    { status: !offer.status, updatedAtTimestamp: Date.now() },
                    { new: true }
                ).lean();
                return responseManager.onSuccess("Offer status updated successfully", updated, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Export Offers =================== **/
exports.exportOffers = async (req, res) => {
    try {
        let { search = "", status } = req.query;
        let query = {};
        if (search && search.trim() !== "") query.offer_name = { $regex: new RegExp(search.trim(), "i") };
        if (status !== undefined) query.status = status === "true";

        const offers = await offerModel.find(query).lean();
        if (!offers || offers.length === 0) return responseManager.badrequest({ message: "No data found to export" }, res);

        const cleaned = offers.map((o, i) => {
            const { __v, createdBy, updatedBy, ...rest } = o;
            return { "Sr No": i + 1, ...rest };
        });

        const ws = XLSX.utils.json_to_sheet(cleaned);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Offers");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Disposition", "attachment; filename=offers.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buffer);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Import Offers =================== **/
exports.importOffers = async (req, res) => {
    try {
        if (!req.file) return responseManager.badrequest({ message: "Please upload a file" }, res);

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!data || data.length === 0) return responseManager.badrequest({ message: "File is empty or invalid" }, res);

        const now = Date.now();
        const adminId = req?.token?.adminId || new mongoose.Types.ObjectId();

        const newOffers = data.map(item => ({
            offer_name: item.offer_name,
            offer_code: item.offer_code,
            discount_value: item.discount_value,
            discount_type: item.discount_type,
            start_datetime: item.start_datetime,
            end_datetime: item.end_datetime,
            applicable_users: item.applicable_users,
            description: item.description || "",
            vehicle_id: item.vehicle_id || [],
            city_location_restriction: item.city_location_restriction || [],
            createdBy: adminId,
            updatedBy: adminId,
            createdAtTimestamp: now,
            updatedAtTimestamp: now,
            status: true
        }));

        const inserted = await offerModel.insertMany(newOffers);
        const totalCount = await offerModel.countDocuments();

        return responseManager.onSuccess(
            `${inserted.length} offers imported successfully. Total: ${totalCount}`,
            { inserted, totalCount },
            res
        );
    } catch (err) { return responseManager.onError(err, res); }
};
