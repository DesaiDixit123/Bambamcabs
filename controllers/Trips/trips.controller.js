const Trip = require('../../models/tripsData.model');
const VehicleType = require('../../models/Admin/Master/vehiclestypes.model');
const axios = require('axios');
let mongoose = require('mongoose');
const responseManager = require("../../utilities/response.manager");
const constants = require("../../utilities/constants");
const mongoConnection = require("../../utilities/connections");
const adminsModel = require("../../models/admins.model");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
exports.createTrip = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }

        const primary = mongoConnection.useDb(constants.DEFAULT_DB);

        const adminData = await primary
            .model(constants.MODELS.admins, adminsModel)
            .findById(new mongoose.Types.ObjectId(req.token.adminId))
            .lean();

        if (!(adminData && adminData.status === true)) {
            return responseManager.unauthorisedRequest(res);
        }

        const { from, to, description, vehicleIds, priceCalculation, trip_type, city } = req.body;

        /** ===== Validations ===== **/
        if (!from || from.trim().length < 2) return responseManager.badrequest({ message: "From location is required" }, res);
        if (!to || to.trim().length < 2) return responseManager.badrequest({ message: "To location is required" }, res);
        if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) return responseManager.badrequest({ message: "At least one vehicle is required" }, res);
        if (!trip_type) return responseManager.badrequest({ message: "Trip type is required" }, res);

        const allowedTripTypes = ["Oneway", "Round Trip", "Local Rental Trip"];
        if (!allowedTripTypes.includes(trip_type)) return responseManager.badrequest({ message: "Invalid trip_type. Allowed: Oneway, Round Trip, Local Rental Trip" }, res);

        /** ===== Check for Duplicate Trip ===== **/
        const existingTrip = await Trip.findOne({
            from: from.trim(),
            to: to.trim(),
            trip_type,
            city: city || '',
            vehicleIds: { $all: vehicleIds, $size: vehicleIds.length }
        });

        if (existingTrip) {
            return responseManager.badrequest({ message: "Duplicate trip exists with same details" }, res);
        }

        /** ===== DistanceMatrix API Call ===== **/
        const apiKey = 'EbB1WBtNMWSaC4nq5A6wQgudF8rp5MKHt8IZ4iQFouwtANcDhhXIkp6rDT39PkIk';
        const url = `https://api.distancematrix.ai/maps/api/distancematrix/json?origins=${encodeURIComponent(from)}&destinations=${encodeURIComponent(to)}&key=${apiKey}`;
        const response = await axios.get(url);

        if (!response.data || !response.data.rows || !response.data.rows[0].elements || response.data.rows[0].elements[0].status !== 'OK') {
            return responseManager.onError({ message: "Distance API error", data: response.data }, res);
        }

        const distanceMeters = response.data.rows[0].elements[0].distance.value;
        const distanceKm = distanceMeters / 1000;

        /** ===== Vehicle Data Fetch ===== **/
        const vehicles = await VehicleType.find({ _id: { $in: vehicleIds } });
        if (!vehicles || vehicles.length === 0) return responseManager.badrequest({ message: "No vehicles found for given IDs" }, res);

        /** ===== Price Calculation ===== **/
        const priceData = vehicles.map(vehicle => {
            let perKmRate = 0;
            let perDayRate = 0;
            let perHourRate = 0;
            let matched = false;

            if (vehicle.states && vehicle.states.length > 0) {
                vehicle.states.forEach(state => {
                    state.cities?.forEach(cityObj => {
                        const fromLower = from.toLowerCase().trim();
                        const toLower = to.toLowerCase().trim();
                        const stateLower = state.state_name?.toLowerCase().trim();
                        const cityLower = cityObj.city_name?.toLowerCase().trim();

                        if (
                            !matched &&
                            (cityLower.includes(fromLower) ||
                                cityLower.includes(toLower) ||
                                stateLower.includes(fromLower) ||
                                stateLower.includes(toLower))
                        ) {
                            perKmRate = cityObj.per_km_price || 0;
                            perDayRate = cityObj.fix_price_per_day || 0;
                            perHourRate = cityObj.per_hour_price || 0;
                            matched = true;
                        }
                    });
                });

                if (!matched) {
                    const defaultCity = vehicle.states[0].cities?.[0];
                    if (defaultCity) {
                        perKmRate = defaultCity.per_km_price || 0;
                        perDayRate = defaultCity.fix_price_per_day || 0;
                        perHourRate = defaultCity.per_hour_price || 0;
                    }
                }
            }

            let calc = {};
            let totalPrice = 0;

            if (priceCalculation.includes("perKm")) {
                calc.perKm = perKmRate;
                const kmPrice = perKmRate * distanceKm;
                calc.totalKmPrice = kmPrice;
                totalPrice += kmPrice;
            }
            if (priceCalculation.includes("perDay")) {
                calc.perDay = perDayRate;
                totalPrice += perDayRate;
            }
            if (priceCalculation.includes("perHour")) {
                calc.perHour = perHourRate;
                totalPrice += perHourRate;
            }

            calc.totalPrice = totalPrice;

            return {
                vehicleId: vehicle._id,
                vehicleName: vehicle.name,
                ...calc
            };
        });

        /** ===== Save Trip ===== **/
        const createdBy = req.token.adminId;
        const tripObj = {
            from: from.trim(),
            to: to.trim(),
            city: city || '',
            trip_type,
            vehicleIds,
            description: description || '',
            totalKm: distanceKm,
            priceCalculation: priceData,
            totalPrice: priceData.reduce((sum, v) => sum + (v.totalPrice || 0), 0),
            createdBy,
            updatedBy: createdBy,
            createAtTimestamp: Date.now(),
            updateAtTimestamp: Date.now(),
            status: true
        };

        const newTrip = await Trip.create(tripObj);
        const populatedTrip = await Trip.findById(newTrip._id).populate('vehicleIds');

        return responseManager.onSuccess("Trip created successfully", populatedTrip, res);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};


exports.createLocalRentalTrip = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }

        const primary = mongoConnection.useDb(constants.DEFAULT_DB);

        const adminData = await primary
            .model(constants.MODELS.admins, adminsModel)
            .findById(new mongoose.Types.ObjectId(req.token.adminId))
            .lean();

        if (!(adminData && adminData.status === true)) {
            return responseManager.unauthorisedRequest(res);
        }

        const { city, vehicleIds, description, priceCalculation } = req.body;

        /** ===== Validations ===== **/
        if (!city || city.trim().length < 2)
            return responseManager.badrequest({ message: "City is required" }, res);

        if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0)
            return responseManager.badrequest({ message: "At least one vehicle is required" }, res);

        /** ===== Check for Duplicate Trip ===== **/
        const existingTrip = await Trip.findOne({
            city: city.trim(),
            trip_type: "Local Rental Trip",
            vehicleIds: { $all: vehicleIds, $size: vehicleIds.length }
        });

        if (existingTrip) {
            return responseManager.badrequest({ message: "Duplicate Local Rental Trip exists with same details" }, res);
        }

        /** ===== Vehicle Data Fetch ===== **/
        const vehicles = await VehicleType.find({ _id: { $in: vehicleIds } });
        if (!vehicles || vehicles.length === 0)
            return responseManager.badrequest({ message: "No vehicles found for given IDs" }, res);

        /** ===== Price Calculation ===== **/
        const priceData = vehicles.map(vehicle => {
            let perDayRate = 0;
            let perHourRate = 0;

            if (vehicle.states && vehicle.states.length > 0) {
                vehicle.states.forEach(state => {
                    state.cities?.forEach(cityObj => {
                        const cityLower = city.toLowerCase().trim();
                        const stateLower = state.state_name?.toLowerCase().trim();
                        const cityNameLower = cityObj.city_name?.toLowerCase().trim();

                        if (cityNameLower.includes(cityLower) || stateLower.includes(cityLower)) {
                            perDayRate = cityObj.fix_price_per_day || 0;
                            perHourRate = cityObj.per_hour_price || 0;
                        }
                    });
                });
            }

            let calc = {};
            let totalPrice = 0;

            if (priceCalculation.includes("perDay")) {
                calc.perDay = perDayRate;
                totalPrice += perDayRate;
            }
            if (priceCalculation.includes("perHour")) {
                calc.perHour = perHourRate;
                totalPrice += perHourRate;
            }

            calc.totalPrice = totalPrice;

            return {
                vehicleId: vehicle._id,
                vehicleName: vehicle.name,
                ...calc
            };
        });

        /** ===== Save Trip ===== **/
        const createdBy = req.token.adminId;
        const tripObj = {
            city: city.trim(),
            trip_type: "Local Rental Trip",
            vehicleIds,
            description: description || '',
            priceCalculation: priceData,
            totalPrice: priceData.reduce((sum, v) => sum + (v.totalPrice || 0), 0),
            createdBy,
            updatedBy: createdBy,
            createAtTimestamp: Date.now(),
            updateAtTimestamp: Date.now(),
            status: true
        };

        const newTrip = await Trip.create(tripObj);
        const populatedTrip = await Trip.findById(newTrip._id).populate('vehicleIds');

        return responseManager.onSuccess("Local Rental Trip created successfully", populatedTrip, res);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};

exports.getOnewayTrips = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        console.log("token:", req.token)
        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }

        const primary = mongoConnection.useDb(constants.DEFAULT_DB);

        // ✅ Admin data fetch & status check
        const adminData = await primary
            .model(constants.MODELS.admins, adminsModel)
            .findById(new mongoose.Types.ObjectId(req.token.adminId))
            .lean();

        if (!(adminData && adminData.status === true)) {
            return responseManager.unauthorisedRequest(res);
        }


        let { page, limit, search, date } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;

        let query = { trip_type: "Oneway" };

        if (search && search.trim() !== '') {
            query.$or = [
                { from: { $regex: search, $options: 'i' } },
                { to: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } }
            ];
        }

        if (date) {
            const start = new Date(date);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        const options = {
            page,
            limit,
            populate: 'vehicleIds',
            sort: { createdAt: -1 },
            lean: true
        };

        const trips = await Trip.paginate(query, options);
        return responseManager.onSuccess("Oneway Trips fetched successfully", trips, res);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};

exports.getOnewayTripById = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        // ✅ Token check
        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }

        const primary = mongoConnection.useDb(constants.DEFAULT_DB);

        // ✅ Admin data fetch & status check
        const adminData = await primary
            .model(constants.MODELS.admins, adminsModel)
            .findById(new mongoose.Types.ObjectId(req.token.adminId))
            .lean();

        if (!(adminData && adminData.status === true)) {
            return responseManager.unauthorisedRequest(res);
        }

        // ✅ Trip fetch by ID
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return responseManager.badrequest({ message: "Invalid trip id" }, res);
        }

        const trip = await Trip.findById(id).populate('vehicleIds');
        if (!trip) {
            return responseManager.badrequest({ message: "Trip not found" }, res);
        }

        // ✅ Condition: Only allow Oneway trip
        if (trip.trip_type !== "Oneway") {
            return responseManager.badrequest({ message: "Only Oneway trip details can be fetched" }, res);
        }

        return responseManager.onSuccess("Trip details", trip, res);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};
// ================== ONEWAY UPDATE ==================
exports.OnewayUpdateTrip = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        // 🔹 Token check
        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }

        const primary = mongoConnection.useDb(constants.DEFAULT_DB);

        // 🔹 Admin validation
        const adminData = await primary
            .model(constants.MODELS.admins, adminsModel)
            .findById(req.token.adminId)
            .lean();

        if (!(adminData && adminData.status === true)) {
            return responseManager.unauthorisedRequest(res);
        }

        // 🔹 Trip validation
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return responseManager.badrequest({ message: "Invalid trip id" }, res);
        }

        const trip = await Trip.findById(id);
        if (!trip) {
            return responseManager.badrequest({ message: "Trip not found" }, res);
        }

        // 🔹 Only allow Oneway trips
        if (trip.trip_type !== "Oneway") {
            return responseManager.badrequest({ message: "Only Oneway trips can be updated" }, res);
        }

        const { from, to, description, vehicleIds, priceCalculation, city } = req.body;

        /** ===== DistanceMatrix API Call ===== **/
        const apiKey = 'EbB1WBtNMWSaC4nq5A6wQgudF8rp5MKHt8IZ4iQFouwtANcDhhXIkp6rDT39PkIk';
        const url = `https://api.distancematrix.ai/maps/api/distancematrix/json?origins=${encodeURIComponent(from)}&destinations=${encodeURIComponent(to)}&key=${apiKey}`;
        const response = await axios.get(url);

        if (!response.data || !response.data.rows || !response.data.rows[0].elements || response.data.rows[0].elements[0].status !== 'OK') {
            return responseManager.onError({ message: "Distance API error", data: response.data }, res);
        }

        const distanceMeters = response.data.rows[0].elements[0].distance.value;
        const distanceKm = distanceMeters / 1000;

        /** ===== Vehicle Data Fetch ===== **/
        const vehicles = await VehicleType.find({ _id: { $in: vehicleIds } });
        if (!vehicles || vehicles.length === 0) return responseManager.badrequest({ message: "No vehicles found for given IDs" }, res);

        /** ===== Price Calculation (same as createTrip) ===== **/
        const priceData = vehicles.map(vehicle => {
            let perKmRate = 0;
            let perDayRate = 0;
            let perHourRate = 0;
            let matched = false;

            if (vehicle.states && vehicle.states.length > 0) {
                vehicle.states.forEach(state => {
                    state.cities?.forEach(cityObj => {
                        const fromLower = from.toLowerCase().trim();
                        const toLower = to.toLowerCase().trim();
                        const stateLower = state.state_name?.toLowerCase().trim();
                        const cityLower = cityObj.city_name?.toLowerCase().trim();

                        if (
                            !matched &&
                            (cityLower.includes(fromLower) ||
                                cityLower.includes(toLower) ||
                                stateLower.includes(fromLower) ||
                                stateLower.includes(toLower))
                        ) {
                            perKmRate = cityObj.per_km_price || 0;
                            perDayRate = cityObj.fix_price_per_day || 0;
                            perHourRate = cityObj.per_hour_price || 0;
                            matched = true;
                        }
                    });
                });

                if (!matched) {
                    const defaultCity = vehicle.states[0].cities?.[0];
                    if (defaultCity) {
                        perKmRate = defaultCity.per_km_price || 0;
                        perDayRate = defaultCity.fix_price_per_day || 0;
                        perHourRate = defaultCity.per_hour_price || 0;
                    }
                }
            }

            let calc = {};
            let totalPrice = 0;

            if (priceCalculation.includes("perKm")) {
                calc.perKm = perKmRate;
                const kmPrice = perKmRate * distanceKm;
                calc.totalKmPrice = kmPrice;
                totalPrice += kmPrice;
            }
            if (priceCalculation.includes("perDay")) {
                calc.perDay = perDayRate;
                totalPrice += perDayRate;
            }
            if (priceCalculation.includes("perHour")) {
                calc.perHour = perHourRate;
                totalPrice += perHourRate;
            }

            calc.totalPrice = totalPrice;

            return {
                vehicleId: vehicle._id,
                vehicleName: vehicle.name,
                ...calc
            };
        });

        /** ===== Update Trip ===== **/
        const updateData = {
            from: from.trim(),
            to: to.trim(),
            city: city || '',
            description: description || '',
            vehicleIds,
            totalKm: distanceKm,
            priceCalculation: priceData,
            totalPrice: priceData.reduce((sum, v) => sum + (v.totalPrice || 0), 0),
            updatedBy: req.token.adminId,
            updateAtTimestamp: Date.now()
        };

        const updatedTrip = await Trip.findByIdAndUpdate(id, updateData, { new: true }).populate("vehicleIds");

        return responseManager.onSuccess("Oneway Trip updated successfully", updatedTrip, res);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};



// ================== ONEWAY TOGGLE STATUS ==================
exports.toggleOnewayTripStatus = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        // 🔹 Token check
        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }

        const primary = mongoConnection.useDb(constants.DEFAULT_DB);

        // 🔹 Admin validation
        const adminData = await primary
            .model(constants.MODELS.admins, adminsModel)
            .findById(req.token.adminId)
            .lean();

        if (!(adminData && adminData.status === true)) {
            return responseManager.unauthorisedRequest(res);
        }

        // 🔹 Trip validation
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return responseManager.badrequest({ message: "Invalid trip id" }, res);
        }

        const trip = await Trip.findById(id);
        if (!trip) {
            return responseManager.badrequest({ message: "Trip not found" }, res);
        }

        // 🔹 Only allow Oneway trips
        if (trip.trip_type !== "Oneway") {
            return responseManager.badrequest({ message: "Only Oneway trips can change status" }, res);
        }

        // 🔹 Toggle status
        trip.status = !trip.status;
        trip.updateAtTimestamp = Date.now();
        await trip.save();

        const updatedTrip = await Trip.findById(id).populate("vehicleIds");

        return responseManager.onSuccess("Oneway Trip status updated", updatedTrip, res);
    } catch (err) {
        return responseManager.onError(err, res);
    }
};


// ================== ONEWAY DELETE ==================
exports.deleteOnewayTrip = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        // 🔹 Token check
        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }

        const primary = mongoConnection.useDb(constants.DEFAULT_DB);

        // 🔹 Admin validation
        const adminData = await primary
            .model(constants.MODELS.admins, adminsModel)
            .findById(req.token.adminId)
            .lean();

        if (!(adminData && adminData.status === true)) {
            return responseManager.unauthorisedRequest(res);
        }

        // 🔹 Trip validation
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return responseManager.badrequest({ message: "Invalid trip id" }, res);
        }

        const trip = await Trip.findById(id).populate("vehicleIds");
        if (!trip) {
            return responseManager.badrequest({ message: "Trip not found" }, res);
        }

        // 🔹 Only allow Oneway trips
        if (trip.trip_type !== "Oneway") {
            return responseManager.badrequest({ message: "Only Oneway trips can be deleted" }, res);
        }

        await Trip.findByIdAndDelete(id);

        return responseManager.onSuccess("Oneway Trip deleted successfully", trip, res);
    } catch (err) {
        return responseManager.onError(err, res);
    }
};

exports.exportOnewayTrips = async (req, res) => {
    try {
        // 🔹 Only fetch Oneway trips & populate vehicleIds
        const trips = await Trip.find({ trip_type: "Oneway" })
            .populate("vehicleIds", "name") // only vehicle name
            .lean();

        if (!trips || trips.length === 0) {
            return responseManager.badrequest({ message: "No Oneway trips found" }, res);
        }

        // 🔹 Prepare clean export data
        const exportData = trips.map((trip, index) => {
            return {
                "Sr No": index + 1,
                "From": trip.from || "",
                "To": trip.to || "",
                "City": trip.city || "",
                "Trip Type": trip.trip_type || "",
                "Vehicles": trip.vehicleIds.map(v => v.name).join(", "), // multiple names
                "Total KM": trip.totalKm || 0,
                "Total Price": trip.totalPrice || 0,
                "Price Calculation": JSON.stringify(trip.priceCalculation), // store as JSON string
                "Description": trip.description || "",
                "Status": trip.status ? "Active" : "Inactive"
            };
        });

        // 🔹 Excel prepare
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Oneway_Trips");

        // 🔹 Ensure uploads folder exists
        const uploadDir = path.join(__dirname, "../../uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, "oneway_trips.xlsx");

        // 🔹 Save file
        XLSX.writeFile(wb, filePath);

        // 🔹 Return file as download
        return res.download(filePath);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};


exports.importOnewayTrips = async (req, res) => {
    try {
        // 🔹 File path (uploads folderમાં save થયેલ excel)
        const filePath = path.join(__dirname, "../../uploads/oneway_trips.xlsx");

        if (!fs.existsSync(filePath)) {
            return responseManager.badrequest({ message: "Excel file not found" }, res);
        }

        // 🔹 Read Excel
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!sheetData || sheetData.length === 0) {
            return responseManager.badrequest({ message: "No data found in Excel" }, res);
        }

        let importedTrips = [];

        for (let row of sheetData) {
            // Skip if no From/To
            if (!row["From"] || !row["To"]) continue;

            // 🔹 Vehicles resolve
            let vehicleIds = [];
            if (row["Vehicles"]) {
                const vehicleNames = row["Vehicles"].split(",").map(v => v.trim());
                const vehicles = await VehicleType.find({ name: { $in: vehicleNames } }).lean();
                vehicleIds = vehicles.map(v => v._id);
            }

            // 🔹 Price Calculation
            let priceCalculation = [];
            if (row["Price Calculation"]) {
                try {
                    priceCalculation = JSON.parse(row["Price Calculation"]);
                } catch (err) {
                    console.log("❌ Price Calculation JSON parse error:", err);
                }
            }

            // 🔹 Prepare Trip object
            const tripObj = {
                from: row["From"] || "",
                to: row["To"] || "",
                city: row["City"] || "",
                trip_type: row["Trip Type"] || "Oneway",
                vehicleIds,
                totalKm: row["Total KM"] || 0,
                totalPrice: row["Total Price"] || 0,
                priceCalculation,
                description: row["Description"] || "",
                status: row["Status"] === "Active" ? true : false,
                createdBy: req.token?.adminId || null
            };

            // 🔹 Insert trip
            const newTrip = await Trip.create(tripObj);
            importedTrips.push(newTrip);
        }

        return responseManager.onSuccess("Trips imported successfully", importedTrips, res);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};



exports.getRoundTrips = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }
        const primary = mongoConnection.useDb(constants.DEFAULT_DB);
        const adminData = await primary.model(constants.MODELS.admins, adminsModel)
            .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();
        if (!(adminData && adminData.status === true)) {
            return responseManager.unauthorisedRequest(res);
        }

        let { page, limit, search, date } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;

        let query = { trip_type: "Round Trip" };

        if (search && search.trim() !== '') {
            query.$or = [
                { from: { $regex: search, $options: 'i' } },
                { to: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } }
            ];
        }

        if (date) {
            const start = new Date(date);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        const options = { page, limit, populate: 'vehicleIds', sort: { createdAt: -1 }, lean: true };
        const trips = await Trip.paginate(query, options);
        return responseManager.onSuccess("Round Trip Trips fetched successfully", trips, res);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};

exports.getRoundTripById = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }
        const primary = mongoConnection.useDb(constants.DEFAULT_DB);
        const adminData = await primary.model(constants.MODELS.admins, adminsModel)
            .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();
        if (!(adminData && adminData.status === true)) {
            return responseManager.unauthorisedRequest(res);
        }

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid trip id" }, res);

        const trip = await Trip.findById(id).populate('vehicleIds');
        if (!trip) return responseManager.badrequest({ message: "Trip not found" }, res);

        if (trip.trip_type !== "Round Trip") {
            return responseManager.badrequest({ message: "Only Round Trip details can be fetched" }, res);
        }

        return responseManager.onSuccess("Trip details", trip, res);
    } catch (err) {
        return responseManager.onError(err, res);
    }
};

exports.RoundTripUpdateTrip = async (req, res) => {
    try {
        // CORS headers
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        // 🔹 Validate admin token
        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }

        const primary = mongoConnection.useDb(constants.DEFAULT_DB);
        const adminData = await primary
            .model(constants.MODELS.admins, adminsModel)
            .findById(req.token.adminId)
            .lean();

        if (!(adminData && adminData.status === true))
            return responseManager.unauthorisedRequest(res);

        // 🔹 Validate trip ID
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id))
            return responseManager.badrequest({ message: "Invalid trip id" }, res);

        const trip = await Trip.findById(id);
        if (!trip)
            return responseManager.badrequest({ message: "Trip not found" }, res);

        if (trip.trip_type !== "Round Trip") {
            return responseManager.badrequest({ message: "Only Round Trip trips can be updated" }, res);
        }

        const { from, to, description, vehicleIds, priceCalculation, city } = req.body;

        /** ===== DistanceMatrix API Call ===== **/
        const apiKey = "EbB1WBtNMWSaC4nq5A6wQgudF8rp5MKHt8IZ4iQFouwtANcDhhXIkp6rDT39PkIk";
        const url = `https://api.distancematrix.ai/maps/api/distancematrix/json?origins=${encodeURIComponent(from)}&destinations=${encodeURIComponent(to)}&key=${apiKey}`;
        const response = await axios.get(url);

        if (!response.data || !response.data.rows || !response.data.rows[0].elements || response.data.rows[0].elements[0].status !== "OK") {
            return responseManager.onError({ message: "Distance API error", data: response.data }, res);
        }

        const distanceMeters = response.data.rows[0].elements[0].distance.value;
        const distanceKm = distanceMeters / 1000;

        /** ===== Vehicle Data Fetch ===== **/
        const vehicles = await VehicleType.find({ _id: { $in: vehicleIds } });
        if (!vehicles || vehicles.length === 0)
            return responseManager.badrequest({ message: "No vehicles found for given IDs" }, res);

        /** ===== Price Calculation (same as createTrip) ===== **/
        const priceData = vehicles.map(vehicle => {
            let perKmRate = 0;
            let perDayRate = 0;
            let perHourRate = 0;
            let matched = false;

            if (vehicle.states && vehicle.states.length > 0) {
                vehicle.states.forEach(state => {
                    state.cities?.forEach(cityObj => {
                        const fromLower = from.toLowerCase().trim();
                        const toLower = to.toLowerCase().trim();
                        const stateLower = state.state_name?.toLowerCase().trim();
                        const cityLower = cityObj.city_name?.toLowerCase().trim();

                        if (
                            !matched &&
                            (cityLower.includes(fromLower) ||
                                cityLower.includes(toLower) ||
                                stateLower.includes(fromLower) ||
                                stateLower.includes(toLower))
                        ) {
                            perKmRate = cityObj.per_km_price || 0;
                            perDayRate = cityObj.fix_price_per_day || 0;
                            perHourRate = cityObj.per_hour_price || 0;
                            matched = true;
                        }
                    });
                });

                if (!matched) {
                    const defaultCity = vehicle.states[0].cities?.[0];
                    if (defaultCity) {
                        perKmRate = defaultCity.per_km_price || 0;
                        perDayRate = defaultCity.fix_price_per_day || 0;
                        perHourRate = defaultCity.per_hour_price || 0;
                    }
                }
            }

            let calc = {};
            let totalPrice = 0;

            if (priceCalculation.includes("perKm")) {
                calc.perKm = perKmRate;
                const kmPrice = perKmRate * distanceKm * 2; // 🔹 Round Trip = double distance
                calc.totalKmPrice = kmPrice;
                totalPrice += kmPrice;
            }
            if (priceCalculation.includes("perDay")) {
                calc.perDay = perDayRate;
                totalPrice += perDayRate;
            }
            if (priceCalculation.includes("perHour")) {
                calc.perHour = perHourRate;
                totalPrice += perHourRate;
            }

            calc.totalPrice = totalPrice;

            return {
                vehicleId: vehicle._id,
                vehicleName: vehicle.name,
                ...calc
            };
        });

        /** ===== Update Trip ===== **/
        const updateData = {
            from: from.trim(),
            to: to.trim(),
            city: city || "",
            description: description || "",
            vehicleIds,
            totalKm: distanceKm * 2, // 🔹 Round trip km double
            priceCalculation: priceData,
            totalPrice: priceData.reduce((sum, v) => sum + (v.totalPrice || 0), 0),
            updatedBy: req.token.adminId,
            updateAtTimestamp: Date.now()
        };

        const updatedTrip = await Trip.findByIdAndUpdate(id, updateData, { new: true }).populate("vehicleIds");

        return responseManager.onSuccess("Round Trip updated successfully", updatedTrip, res);
    } catch (err) {
        return responseManager.onError(err, res);
    }
};


exports.toggleRoundTripStatus = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }
        const primary = mongoConnection.useDb(constants.DEFAULT_DB);
        const adminData = await primary.model(constants.MODELS.admins, adminsModel)
            .findById(req.token.adminId).lean();
        if (!(adminData && adminData.status === true)) return responseManager.unauthorisedRequest(res);

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid trip id" }, res);

        const trip = await Trip.findById(id);
        if (!trip) return responseManager.badrequest({ message: "Trip not found" }, res);

        if (trip.trip_type !== "Round Trip") {
            return responseManager.badrequest({ message: "Only Round Trip trips can change status" }, res);
        }

        trip.status = !trip.status;
        trip.updateAtTimestamp = Date.now();
        await trip.save();

        const updatedTrip = await Trip.findById(id).populate("vehicleIds");
        return responseManager.onSuccess("Round Trip status updated", updatedTrip, res);
    } catch (err) {
        return responseManager.onError(err, res);
    }
};

exports.deleteRoundTrip = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }
        const primary = mongoConnection.useDb(constants.DEFAULT_DB);
        const adminData = await primary.model(constants.MODELS.admins, adminsModel)
            .findById(req.token.adminId).lean();
        if (!(adminData && adminData.status === true)) return responseManager.unauthorisedRequest(res);

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid trip id" }, res);

        const trip = await Trip.findById(id).populate("vehicleIds");
        if (!trip) return responseManager.badrequest({ message: "Trip not found" }, res);

        if (trip.trip_type !== "Round Trip") {
            return responseManager.badrequest({ message: "Only Round Trip trips can be deleted" }, res);
        }

        await Trip.findByIdAndDelete(id);
        return responseManager.onSuccess("Round Trip deleted successfully", trip, res);
    } catch (err) {
        return responseManager.onError(err, res);
    }
};

exports.exportRoundTrips = async (req, res) => {
    try {
        const trips = await Trip.find({ trip_type: "Round Trip" })
            .populate("vehicleIds", "name").lean();

        if (!trips || trips.length === 0) {
            return responseManager.badrequest({ message: "No Round Trip trips found" }, res);
        }

        const exportData = trips.map((trip, index) => ({
            "Sr No": index + 1,
            "From": trip.from || "",
            "To": trip.to || "",
            "City": trip.city || "",
            "Trip Type": trip.trip_type || "",
            "Vehicles": trip.vehicleIds.map(v => v.name).join(", "),
            "Total KM": trip.totalKm || 0,
            "Total Price": trip.totalPrice || 0,
            "Price Calculation": JSON.stringify(trip.priceCalculation),
            "Description": trip.description || "",
            "Status": trip.status ? "Active" : "Inactive"
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Round_Trips");

        const uploadDir = path.join(__dirname, "../../uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, "round_trips.xlsx");
        XLSX.writeFile(wb, filePath);
        return res.download(filePath);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};

exports.importRoundTrips = async (req, res) => {
    try {
        // Accept uploaded file via multer OR from fixed path
        const filePath = req.file ? req.file.path : path.join(__dirname, "../../uploads/round_trips.xlsx");

        if (!fs.existsSync(filePath)) {
            return responseManager.badrequest({ message: "Excel file not found" }, res);
        }

        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!sheetData || sheetData.length === 0) {
            return responseManager.badrequest({ message: "No data found in Excel" }, res);
        }

        let importedTrips = [];
        for (let row of sheetData) {
            if (!row["From"] || !row["To"]) continue;

            let vehicleIds = [];
            if (row["Vehicles"]) {
                const vehicleNames = row["Vehicles"].split(",").map(v => v.trim());
                const vehicles = await VehicleType.find({ name: { $in: vehicleNames } }).lean();
                vehicleIds = vehicles.map(v => v._id);
            }

            let priceCalculation = [];
            if (row["Price Calculation"]) {
                try { priceCalculation = JSON.parse(row["Price Calculation"]); } catch (err) { priceCalculation = []; }
            }

            const tripObj = {
                from: row["From"] || "",
                to: row["To"] || "",
                city: row["City"] || "",
                trip_type: row["Trip Type"] || "Round Trip",
                vehicleIds,
                totalKm: row["Total KM"] || 0,
                totalPrice: row["Total Price"] || 0,
                priceCalculation,
                description: row["Description"] || "",
                status: row["Status"] === "Active" ? true : false,
                createdBy: req.token?.adminId || null
            };

            const newTrip = await Trip.create(tripObj);
            importedTrips.push(newTrip);
        }

        return responseManager.onSuccess("Round Trips imported successfully", importedTrips, res);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};


// ================== LOCAL RENTAL TRIPS ==================
exports.getLocalRentalTrips = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }
        const primary = mongoConnection.useDb(constants.DEFAULT_DB);
        const adminData = await primary.model(constants.MODELS.admins, adminsModel)
            .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();
        if (!(adminData && adminData.status === true)) {
            return responseManager.unauthorisedRequest(res);
        }

        let { page, limit, search, date } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;

        let query = { trip_type: "Local Rental Trip" };

        if (search && search.trim() !== '') {
            query.$or = [
                { from: { $regex: search, $options: 'i' } },
                { to: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } }
            ];
        }

        if (date) {
            const start = new Date(date);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        const options = { page, limit, populate: 'vehicleIds', sort: { createdAt: -1 }, lean: true };
        const trips = await Trip.paginate(query, options);
        return responseManager.onSuccess("Local Rental Trips fetched successfully", trips, res);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};

exports.getLocalRentalTripById = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }
        const primary = mongoConnection.useDb(constants.DEFAULT_DB);
        const adminData = await primary.model(constants.MODELS.admins, adminsModel)
            .findById(new mongoose.Types.ObjectId(req.token.adminId)).lean();
        if (!(adminData && adminData.status === true)) {
            return responseManager.unauthorisedRequest(res);
        }

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid trip id" }, res);

        const trip = await Trip.findById(id).populate('vehicleIds');
        if (!trip) return responseManager.badrequest({ message: "Trip not found" }, res);

        if (trip.trip_type !== "Local Rental Trip") {
            return responseManager.badrequest({ message: "Only Local Rental Trip details can be fetched" }, res);
        }

        return responseManager.onSuccess("Trip details", trip, res);
    } catch (err) {
        return responseManager.onError(err, res);
    }
};

exports.LocalRentalUpdateTrip = async (req, res) => {
    try {
        // CORS headers
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        // Validate admin token
        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }

        const primary = mongoConnection.useDb(constants.DEFAULT_DB);
        const adminData = await primary
            .model(constants.MODELS.admins, adminsModel)
            .findById(req.token.adminId)
            .lean();

        if (!(adminData && adminData.status === true))
            return responseManager.unauthorisedRequest(res);

        // Validate trip ID
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id))
            return responseManager.badrequest({ message: "Invalid trip id" }, res);

        const trip = await Trip.findById(id);
        if (!trip)
            return responseManager.badrequest({ message: "Trip not found" }, res);

        if (trip.trip_type !== "Local Rental Trip") {
            return responseManager.badrequest({ message: "Only Local Rental trips can be updated" }, res);
        }

        // Prepare priceCalculation safely
        let priceCalculation = [];
        if (Array.isArray(req.body.priceCalculation)) {
            priceCalculation = req.body.priceCalculation.map(item => {
                if (typeof item === "object" && item !== null) {
                    return item; // already object
                } else if (typeof item === "string") {
                    return { type: item, value: 0 }; // string → default object
                } else {
                    return { type: "unknown", value: 0 }; // fallback
                }
            });
        }

        // Update trip data
        const updateData = {
            ...req.body,
            updateAtTimestamp: Date.now(),
            priceCalculation
        };

        const updatedTrip = await Trip.findByIdAndUpdate(id, updateData, { new: true }).populate("vehicleIds");

        return responseManager.onSuccess("Local Rental Trip updated successfully", updatedTrip, res);
    } catch (err) {
        return responseManager.onError(err, res);
    }
};

exports.toggleLocalRentalTripStatus = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }
        const primary = mongoConnection.useDb(constants.DEFAULT_DB);
        const adminData = await primary.model(constants.MODELS.admins, adminsModel)
            .findById(req.token.adminId).lean();
        if (!(adminData && adminData.status === true)) return responseManager.unauthorisedRequest(res);

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid trip id" }, res);

        const trip = await Trip.findById(id);
        if (!trip) return responseManager.badrequest({ message: "Trip not found" }, res);

        if (trip.trip_type !== "Local Rental Trip") {
            return responseManager.badrequest({ message: "Only Local Rental trips can change status" }, res);
        }

        trip.status = !trip.status;
        trip.updateAtTimestamp = Date.now();
        await trip.save();

        const updatedTrip = await Trip.findById(id).populate("vehicleIds");
        return responseManager.onSuccess("Local Rental Trip status updated", updatedTrip, res);
    } catch (err) {
        return responseManager.onError(err, res);
    }
};

exports.deleteLocalRentalTrip = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        if (!(req.token && mongoose.Types.ObjectId.isValid(req.token.adminId))) {
            return responseManager.unauthorisedRequest(res);
        }
        const primary = mongoConnection.useDb(constants.DEFAULT_DB);
        const adminData = await primary.model(constants.MODELS.admins, adminsModel)
            .findById(req.token.adminId).lean();
        if (!(adminData && adminData.status === true)) return responseManager.unauthorisedRequest(res);

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid trip id" }, res);

        const trip = await Trip.findById(id).populate("vehicleIds");
        if (!trip) return responseManager.badrequest({ message: "Trip not found" }, res);

        if (trip.trip_type !== "Local Rental Trip") {
            return responseManager.badrequest({ message: "Only Local Rental trips can be deleted" }, res);
        }

        await Trip.findByIdAndDelete(id);
        return responseManager.onSuccess("Local Rental Trip deleted successfully", trip, res);
    } catch (err) {
        return responseManager.onError(err, res);
    }
};

exports.exportLocalRentalTrips = async (req, res) => {
    try {
        const trips = await Trip.find({ trip_type: "Local Rental Trip" })
            .populate("vehicleIds", "name").lean();

        if (!trips || trips.length === 0) {
            return responseManager.badrequest({ message: "No Local Rental trips found" }, res);
        }

        const exportData = trips.map((trip, index) => ({
            "Sr No": index + 1,
            "From": trip.from || "",
            "To": trip.to || "",
            "City": trip.city || "",
            "Trip Type": trip.trip_type || "",
            "Vehicles": trip.vehicleIds.map(v => v.name).join(", "),
            "Total KM": trip.totalKm || 0,
            "Total Price": trip.totalPrice || 0,
            "Price Calculation": JSON.stringify(trip.priceCalculation),
            "Description": trip.description || "",
            "Status": trip.status ? "Active" : "Inactive"
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Local_Rental_Trips");

        const uploadDir = path.join(__dirname, "../../uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, "local_rental_trips.xlsx");
        XLSX.writeFile(wb, filePath);
        return res.download(filePath);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};

exports.importLocalRentalTrips = async (req, res) => {
    try {
        const filePath = req.file ? req.file.path : path.join(__dirname, "../../uploads/local_rental_trips.xlsx");

        if (!fs.existsSync(filePath)) {
            return responseManager.badrequest({ message: "Excel file not found" }, res);
        }

        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!sheetData || sheetData.length === 0) {
            return responseManager.badrequest({ message: "No data found in Excel" }, res);
        }

        let importedTrips = [];
        for (let row of sheetData) {
            // 🔹 Required: city OR vehicleIds OR description
            if (!row["City"] && !row["Vehicles"] && !row["Description"]) continue;

            // 🔹 Vehicles lookup
            let vehicleIds = [];
            if (row["Vehicles"]) {
                const vehicleNames = row["Vehicles"].split(",").map(v => v.trim());
                const vehicles = await VehicleType.find({ name: { $in: vehicleNames } }).lean();
                vehicleIds = vehicles.map(v => v._id);
            }

            const tripObj = {
                city: row["City"] || "",
                trip_type: "Local Rental Trip", // 🔹 fixed trip_type
                vehicleIds,
                description: row["Description"] || "",
                status: row["Status"] === "Active" ? true : false,
                createdBy: req.token?.adminId || null
            };

            const newTrip = await Trip.create(tripObj);
            importedTrips.push(newTrip);
        }

        return responseManager.onSuccess("Local Rental Trips imported successfully", importedTrips, res);

    } catch (err) {
        return responseManager.onError(err, res);
    }
};
