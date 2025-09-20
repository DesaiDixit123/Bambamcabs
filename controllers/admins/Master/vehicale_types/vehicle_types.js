const responseManager = require("../../../../utilities/response.manager");
const mongoose = require("mongoose");
const vehicleTypeModel = require("../../../../models/Admin/Master/vehiclestypes.model");
const mongoConnection = require('../../../../utilities/connections');
const constants = require('../../../../utilities/constants');
const config = require('../../../../utilities/config');
const adminsModel = require('../../../../models/admins.model');
const XLSX = require("xlsx");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const { State, City } = require("country-state-city");


exports.addVehicleType = async (req, res) => {
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
                const {
                    name,
                    state,
                    applyToAllCities,
                    fix_price_per_day,
                    upto_km,
                    per_km_price,
                    per_hour_price,
                    cities
                } = req.body;

                /** ===== Validations ===== **/
                if (!name || name.trim().length < 2) {
                    return responseManager.badrequest({ message: "Vehicle type name must be at least 2 characters long" }, res);
                }
                if (!state || state.trim().length < 2) {
                    return responseManager.badrequest({ message: "State is required" }, res);
                }

                /** ===== Duplicate Check ===== **/
                const existing = await vehicleTypeModel.findOne({
                    name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
                    state: { $regex: new RegExp(`^${state.trim()}$`, "i") }
                }).lean();

                if (existing) {
                    return responseManager.badrequest({ message: "Vehicle type already exists for this state" }, res);
                }

                /** ===== City Data Build ===== **/
                let citiesData = [];

                if (applyToAllCities === true) {
                    // 👇 auto fetch all cities from state
                    const states = State.getStatesOfCountry("IN");
                    const stateObj = states.find(s => s.name.toLowerCase() === state.toLowerCase());
                    if (!stateObj) {
                        return responseManager.badrequest({ message: "Invalid state provided" }, res);
                    }

                    const allCitiesInState = City.getCitiesOfState("IN", stateObj.isoCode);
                    citiesData = allCitiesInState.map(city => ({
                        city_name: city.name,
                        fix_price_per_day: parseFloat(fix_price_per_day),
                        upto_km: parseInt(upto_km),
                        per_km_price: parseFloat(per_km_price),
                        per_hour_price: parseFloat(per_hour_price),
                        status: true
                    }));
                }
                else if (Array.isArray(cities) && cities.length > 0) {
                    citiesData = cities.map(city => ({
                        city_name: city.city_name,
                        fix_price_per_day: parseFloat(city.fix_price_per_day),
                        upto_km: parseInt(city.upto_km),
                        per_km_price: parseFloat(city.per_km_price),
                        per_hour_price: parseFloat(city.per_hour_price),
                        status: true
                    }));
                } else {
                    return responseManager.badrequest({ message: "Please provide cities data" }, res);
                }

                /** ===== Save Object ===== **/
                const createdBy = req.token.adminId;
                const vehicleTypeObj = {
                    name: name.trim(),
                    state: state.trim(),
                    cities: citiesData,
                    status: true,
                    vendor_id: null,
                    admin_id: createdBy,
                    createdBy,
                    updatedBy: createdBy,
                    createAtTimestamp: Date.now(),
                    updateAtTimestamp: Date.now()
                };

                const newVehicleType = await vehicleTypeModel.create(vehicleTypeObj);
                const responseData = {
                    ...newVehicleType.toObject(),
                    totalCity: newVehicleType.cities.length,
                    fix_price_per_day: parseFloat(fix_price_per_day),
                    upto_km: parseInt(upto_km),
                    per_km_price: parseFloat(per_km_price),
                    per_hour_price: parseFloat(per_hour_price)
                };
                return responseManager.onSuccess("Vehicle type added successfully", responseData, res);

            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};


exports.addOrUpdateVehicleTypeState = async (req, res) => {
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
                const {
                    type_name,
                    state,
                    applyToAllCities,
                    fix_price_per_day,
                    upto_km,
                    per_km_price,
                    per_hour_price,
                    cities
                } = req.body;

                if (!type_name || type_name.trim().length < 2) {
                    return responseManager.badrequest({ message: "Type name is required" }, res);
                }
                if (!state || state.trim().length < 2) {
                    return responseManager.badrequest({ message: "State is required" }, res);
                }

                // ✅ check if type exists
                let vehicleType = await vehicleTypeModel.findOne({
                    name: { $regex: new RegExp(`^${type_name.trim()}$`, "i") }
                });

                if (!vehicleType) {
                    return responseManager.badrequest({ message: "Vehicle type not found, please create first" }, res);
                }

                /** ===== City Data Build ===== **/
                let citiesData = [];
                if (applyToAllCities === true) {
                    const states = State.getStatesOfCountry("IN");
                    const stateObj = states.find(s => s.name.toLowerCase() === state.toLowerCase());
                    if (!stateObj) {
                        return responseManager.badrequest({ message: "Invalid state provided" }, res);
                    }

                    const allCitiesInState = City.getCitiesOfState("IN", stateObj.isoCode);
                    citiesData = allCitiesInState.map(city => ({
                        city_name: city.name,
                        fix_price_per_day: parseFloat(fix_price_per_day),
                        upto_km: parseInt(upto_km),
                        per_km_price: parseFloat(per_km_price),
                        per_hour_price: parseFloat(per_hour_price),
                        status: true
                    }));
                } else if (Array.isArray(cities) && cities.length > 0) {
                    citiesData = cities.map(city => ({
                        city_name: city.city_name,
                        fix_price_per_day: parseFloat(city.fix_price_per_day),
                        upto_km: parseInt(city.upto_km),
                        per_km_price: parseFloat(city.per_km_price),
                        per_hour_price: parseFloat(city.per_hour_price),
                        status: true
                    }));
                } else {
                    return responseManager.badrequest({ message: "Please provide cities data" }, res);
                }

                /** ===== Update or Insert state ===== **/
                let existingStateIndex = vehicleType.states.findIndex(
                    s => s.state_name.toLowerCase() === state.toLowerCase()
                );

                if (existingStateIndex >= 0) {
                    // update cities of that state
                    vehicleType.states[existingStateIndex].cities = citiesData;
                } else {
                    // add new state
                    vehicleType.states.push({
                        state_name: state.trim(),
                        cities: citiesData
                    });
                }

                vehicleType.updatedBy = req.token.adminId;
                vehicleType.updateAtTimestamp = Date.now();

                await vehicleType.save();

                return responseManager.onSuccess("State and cities updated successfully", vehicleType, res);
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

exports.getVehicleTypeStateById = async (req, res) => {
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
                const { vehicleTypeId } = req.params;

                if (!mongoose.Types.ObjectId.isValid(vehicleTypeId)) {
                    return responseManager.badrequest({ message: "Invalid vehicleTypeId" }, res);
                }

                let vehicleType = await vehicleTypeModel.findById(vehicleTypeId).lean();

                if (!vehicleType) {
                    return responseManager.badrequest({ message: "Vehicle type not found" }, res);
                }

                // extract states data with totalCities and price fields (from first city since all same)
                let statesData = [];
                if (vehicleType.states && vehicleType.states.length > 0) {
                    statesData = vehicleType.states.map(st => {
                        let priceData = {};
                        if (st.cities && st.cities.length > 0) {
                            let city = st.cities[0]; // prices same for all cities, so pick first
                            priceData = {
                                fix_price_per_day: city.fix_price_per_day,
                                upto_km: city.upto_km,
                                per_km_price: city.per_km_price,
                                per_hour_price: city.per_hour_price,
                                status: city.status
                            };
                        }
                        return {
                            state_name: st.state_name,
                            totalCities: (st.cities && st.cities.length) ? st.cities.length : 0,
                            ...priceData
                        };
                    });
                }

                let responseData = {
                    _id: vehicleType._id,
                    name: vehicleType.name,
                    states: statesData
                };

                return responseManager.onSuccess("Vehicle type details fetched successfully", responseData, res);
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

exports.simpleAddVehicleType = async (req, res) => {
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
                const { type_name } = req.body;

                if (!type_name || type_name.trim().length < 2) {
                    return responseManager.badrequest({ message: "Type name must be at least 2 characters long" }, res);
                }

                // Duplicate check
                const existing = await vehicleTypeModel.findOne({
                    name: { $regex: new RegExp(`^${type_name.trim()}$`, "i") }
                }).lean();

                if (existing) {
                    return responseManager.badrequest({ message: "This type already exists" }, res);
                }

                // Save object
                const createdBy = req.token.adminId;
                const vehicleTypeObj = {
                    name: type_name.trim(),
                    state: "",
                    cities: [],
                    status: true,
                    vendor_id: null,
                    admin_id: createdBy,
                    createdBy,
                    updatedBy: createdBy,
                    createAtTimestamp: Date.now(),
                    updateAtTimestamp: Date.now()
                };

                const newVehicleType = await vehicleTypeModel.create(vehicleTypeObj);

                return responseManager.onSuccess("Vehicle type saved successfully", newVehicleType, res);
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

exports.updateVehicleTypeCity = async (req, res) => {
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
                const { vehicleTypeId, city_id, fix_price_per_day, upto_km, per_km_price, per_hour_price } = req.body;

                if (!vehicleTypeId || !mongoose.Types.ObjectId.isValid(vehicleTypeId)) {
                    return responseManager.badrequest({ message: "Valid vehicleTypeId required" }, res);
                }
                if (!city_id || !mongoose.Types.ObjectId.isValid(city_id)) {
                    return responseManager.badrequest({ message: "Valid city_id required" }, res);
                }

                let updatedVehicle = await vehicleTypeModel.findOneAndUpdate(
                    { _id: vehicleTypeId, "cities._id": new mongoose.Types.ObjectId(city_id) },
                    {
                        $set: {
                            "cities.$.fix_price_per_day": parseFloat(fix_price_per_day),
                            "cities.$.upto_km": parseInt(upto_km),
                            "cities.$.per_km_price": parseFloat(per_km_price),
                            "cities.$.per_hour_price": parseFloat(per_hour_price),
                            "cities.$.status": true,
                            updateAtTimestamp: Date.now(),
                            updatedBy: req.token.adminId
                        }
                    },
                    { new: true }
                ).lean();

                if (updatedVehicle) {
                    return responseManager.onSuccess("City updated successfully", updatedVehicle, res);
                } else {
                    return responseManager.badrequest({ message: "City not found in vehicle type" }, res);
                }
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

exports.listVehicleTypes = async (req, res) => {
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
                let vehicleTypes = await vehicleTypeModel.find({}).lean();

                return responseManager.onSuccess("Vehicle types fetched successfully", vehicleTypes, res);
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


exports.getVehicleTypeCities = async (req, res) => {
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
                const { vehicleTypeId, page = 1, limit = 10 } = req.body;

                if (!vehicleTypeId || !mongoose.Types.ObjectId.isValid(vehicleTypeId)) {
                    return responseManager.badrequest({ message: "Valid vehicleTypeId required" }, res);
                }

                // aggregate cities array with pagination
                let aggregateQuery = [
                    { $match: { _id: new mongoose.Types.ObjectId(vehicleTypeId) } },
                    { $unwind: "$cities" },
                    {
                        $project: {
                            _id: "$cities._id",
                            city_name: "$cities.city_name",
                            fix_price_per_day: "$cities.fix_price_per_day",
                            upto_km: "$cities.upto_km",
                            per_km_price: "$cities.per_km_price",
                            per_hour_price: "$cities.per_hour_price",
                            status: "$cities.status"
                        }
                    }
                ];

                let options = {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    lean: true
                };

                const result = await vehicleTypeModel.aggregatePaginate(
                    vehicleTypeModel.aggregate(aggregateQuery),
                    options
                );

                // format response
                let responseData = {
                    currentPage: result.page,
                    totalPages: result.totalPages,
                    totalCities: result.totalDocs,
                    cities: result.docs
                };

                return responseManager.onSuccess("Cities fetched successfully", responseData, res);

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

exports.getVehicleTypeStateByStateId = async (req, res) => {
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
                const { stateId } = req.params;

                if (!mongoose.Types.ObjectId.isValid(stateId)) {
                    return responseManager.badrequest({ message: "Invalid stateId" }, res);
                }

                // find vehicle type which has this state
                let vehicleType = await vehicleTypeModel.findOne(
                    { "states._id": stateId },
                    { "states.$": 1, name: 1 } // fetch only matched state
                ).lean();

                if (!vehicleType || !vehicleType.states || vehicleType.states.length === 0) {
                    return responseManager.badrequest({ message: "State not found in any vehicle type" }, res);
                }

                let state = vehicleType.states[0];

                // prepare city data
                let citiesData = [];
                if (state.cities && state.cities.length > 0) {
                    citiesData = state.cities.map(ct => ({
                        city_name: ct.city_name,
                        fix_price_per_day: ct.fix_price_per_day,
                        upto_km: ct.upto_km,
                        per_km_price: ct.per_km_price,
                        per_hour_price: ct.per_hour_price,
                        status: ct.status
                    }));
                }

                let responseData = {
                    vehicleTypeId: vehicleType._id,
                    vehicleTypeName: vehicleType.name,
                    state: {
                        _id: state._id,
                        state_name: state.state_name,
                        fix_price_per_day: state.fix_price_per_day,
                        upto_km: state.upto_km,
                        per_km_price: state.per_km_price,
                        per_hour_price: state.per_hour_price,
                        status: state.status,
                        cities_count: citiesData.length,
                        cities: citiesData
                    }
                };

                return responseManager.onSuccess("State details with cities fetched successfully", responseData, res);
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

exports.deleteVehicleTypeCity = async (req, res) => {
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
                const { vehicleTypeId, cityId } = req.body;

                if (!vehicleTypeId || !mongoose.Types.ObjectId.isValid(vehicleTypeId)) {
                    return responseManager.badrequest({ message: "Valid vehicleTypeId required" }, res);
                }
                if (!cityId || !mongoose.Types.ObjectId.isValid(cityId)) {
                    return responseManager.badrequest({ message: "Valid cityId required" }, res);
                }

                let updatedVehicle = await vehicleTypeModel.findOneAndUpdate(
                    { _id: vehicleTypeId },
                    {
                        $pull: { cities: { _id: new mongoose.Types.ObjectId(cityId) } },
                        $set: {
                            updateAtTimestamp: Date.now(),
                            updatedBy: req.token.adminId
                        }
                    },
                    { new: true }
                ).lean();

                if (updatedVehicle) {
                    return responseManager.onSuccess("City deleted successfully", updatedVehicle, res);
                } else {
                    return responseManager.badrequest({ message: "Vehicle type or city not found" }, res);
                }

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

exports.getVehicleTypeById = async (req, res) => {
    try {

        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);

            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                // let havepermission = await config.getPermission(adminData.roleid, 'vehiclestypes', 'insert');
                // if (havepermission) {
                const { id } = req.params;

                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return responseManager.badrequest({ message: "Invalid Vehicle Type ID" }, res);
                }

                const vehicleType = await vehicleTypeModel.findById(id).lean();

                if (!vehicleType) {
                    return responseManager.badrequest({ message: "Vehicle Type not found" }, res);
                }

                return responseManager.onSuccess("Vehicle type fetched successfully", vehicleType, res);

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



exports.updateVehicleType = async (req, res) => {
    try {

        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);

            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                // let havepermission = await config.getPermission(adminData.roleid, 'vehiclestypes', 'insert');
                // if (havepermission) {
                const { id } = req.params;
                const { name, fix_price_per_day, upto_km, per_km_price, per_hour_price } = req.body;

                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return responseManager.badrequest({ message: "Invalid Vehicle Type ID" }, res);
                }

                let updateObj = {};
                if (name) updateObj.name = name.trim();
                if (fix_price_per_day) updateObj.fix_price_per_day = parseFloat(fix_price_per_day);
                if (upto_km) updateObj.upto_km = parseInt(upto_km);
                if (per_km_price) updateObj.per_km_price = parseFloat(per_km_price);
                if (per_hour_price) updateObj.per_hour_price = parseFloat(per_hour_price);
                updateObj.updatedAtTimestamp = Date.now();

                const updated = await vehicleTypeModel.findByIdAndUpdate(id, updateObj, { new: true }).lean();

                return responseManager.onSuccess("Vehicle type updated successfully", updated, res);


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



exports.deleteVehicleType = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);

            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                // let havepermission = await config.getPermission(adminData.roleid, 'vehiclestypes', 'insert');
                // if (havepermission) {
                const { id } = req.params;

                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return responseManager.badrequest({ message: "Invalid Vehicle Type ID" }, res);
                }

                await vehicleTypeModel.findByIdAndDelete(id);

                return responseManager.onSuccess("Vehicle type deleted successfully", {}, res);


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



exports.toggleVehicleTypeStatus = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return responseManager.badrequest({ message: "Invalid Vehicle Type ID" }, res);
        }

        const vehicleType = await vehicleTypeModel.findById(id).lean();
        if (!vehicleType) {
            return responseManager.badrequest({ message: "Vehicle Type not found" }, res);
        }

        const updated = await vehicleTypeModel.findByIdAndUpdate(
            id,
            { status: !vehicleType.status, updatedAtTimestamp: Date.now() },
            { new: true }
        ).lean();

        return responseManager.onSuccess("Vehicle type status updated successfully", updated, res);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};


exports.exportVehicleTypes = async (req, res) => {
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
        const vehicleTypes = await vehicleTypeModel.find(query).lean();

        if (!vehicleTypes || vehicleTypes.length === 0) {
            return responseManager.badrequest({ message: "No data found to export" }, res);
        }

        // ===== Clean data + add Serial No =====
        const cleanedData = vehicleTypes.map((item, index) => {
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
        XLSX.utils.book_append_sheet(wb, ws, "VehicleTypes");

        // ===== File buffer generate karo =====
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Disposition", "attachment; filename=vehicle_types.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        return res.send(buffer);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};

exports.importVehicleTypes = async (req, res) => {
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

        // Default values
        const now = Date.now();
        const adminId = req?.token?.adminId || new mongoose.Types.ObjectId();

        // DB ma already existing names fetch karo
        const existingVehicleTypes = await vehicleTypeModel.find({}, { name: 1 }).lean();
        const existingNames = existingVehicleTypes.map(v => v.name.toLowerCase());

        // Only new vehicle types add karva
        const newVehicleTypes = data
            .filter(item => item.name && !existingNames.includes(item.name.toLowerCase()))
            .map(item => ({
                ...item,
                createdBy: adminId,
                updatedBy: adminId,
                createAtTimestamp: now,
                updateAtTimestamp: now,
                status: true
            }));

        if (newVehicleTypes.length === 0) {
            return responseManager.badrequest({ message: "All vehicle types already exist, nothing new to import" }, res);
        }

        // DB ma insert karo
        const inserted = await vehicleTypeModel.insertMany(newVehicleTypes);

        // Total count fetch karo
        const totalCount = await vehicleTypeModel.countDocuments();

        return responseManager.onSuccess(
            `${inserted.length} vehicle types imported successfully. Total records now: ${totalCount}`,
            { inserted, totalCount },
            res
        );

    } catch (err) {
        return responseManager.onError(err, res);
    }
};
