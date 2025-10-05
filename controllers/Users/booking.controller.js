const mongoose = require("mongoose");
const responseManager = require("../../utilities/response.manager");
const Trip = require("../../models/tripsData.model");
const Vehicle = require("../../models/vehicles.model");
const Offer = require("../../models/Admin/Master/Offer.model");
const Booking = require("../../models/User/booking.model");
const User = require('../../models/User/user.model'); // user model

const SpecialServices = require("../../models/Admin/Master/Special_Services.model"); // tamaro model path
const ExploreCabs = require("../../models/User/exploreCabs.model");

  exports.explorweCabsGetAvailableVehicles = async (req, res) => {
    try {
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
      res.setHeader("Access-Control-Allow-Origin", "*");

      // 🔒 User authentication check
      if (!(req.user && mongoose.Types.ObjectId.isValid(req.user._id))) {
        return responseManager.unauthorisedRequest(res);
      }

      const { from, to, pickup_date, pickup_time, trip_type, city } = req.body;

      /** ===== Validations ===== **/
      if (!trip_type)
        return responseManager.badrequest({ message: "Trip type is required" }, res);

      if ((trip_type === "Oneway" || trip_type === "Round Trip") && (!from || !to))
        return responseManager.badrequest({ message: "From & To required" }, res);

      if (trip_type === "Local Rental Trip" && !city)
        return responseManager.badrequest({ message: "City required for local rental trip" }, res);

      if (!pickup_date || !pickup_time)
        return responseManager.badrequest({ message: "Pickup date & time required" }, res);

      /** ===== Build query ===== **/
      const query = {
        status: true,
        trip_type: trip_type.trim(),
      };

      if (trip_type === "Oneway" || trip_type === "Round Trip") {
        query.from = new RegExp(`^${from.trim()}$`, "i");
        query.to = new RegExp(`^${to.trim()}$`, "i");
      } else if (trip_type === "Local Rental Trip") {
        query.city = new RegExp(`^${city.trim()}$`, "i");
      }

      /** ===== Find trip ===== **/
      const trip = await Trip.findOne(query).lean();

      let vehicles = [];
      let is_result_found = false;

      if (trip) {
        if (trip.vehicleIds && trip.vehicleIds.length > 0) {
          vehicles = await Vehicle.find({
            vehicle_type: { $in: trip.vehicleIds },
            status: true,
          })
            .populate("vehicle_type")
            .lean();
        }
        is_result_found = true;
      }

      /** ===== Save explore data ===== **/
      const exploreData = new ExploreCabs({
        userId: req.user._id,
        trip_type,
        from,
        to,
        city,
        pickup_date,
        pickup_time,
        tripId: trip ? trip._id : null,
        totalKm: trip ? trip.totalKm : null,
        duration: trip ? trip.duration : null,
        vehicleIds: vehicles.map(v => v._id),
        is_result_found,
      });

      await exploreData.save();

      /** ===== Final Response ===== **/
      return responseManager.onSuccess(
        `${trip_type} trip ${is_result_found ? "found" : "not found"}`,
        { trip, vehicles, exploreId: exploreData._id },
        res
      );

    } catch (err) {
      console.error("Error in explorweCabsGetAvailableVehicles:", err);
      return responseManager.onError(err, res);
    }
  };



exports.getVehiclesOffers = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { vehicleId, from, to, search } = req.query;

    /** 🔒 Validation */
    if (!vehicleId || !mongoose.Types.ObjectId.isValid(vehicleId)) {
      return responseManager.badrequest({ message: "Valid vehicleId required" }, res);
    }

    if (!from || !to) {
      return responseManager.badrequest({ message: "From and To locations required" }, res);
    }

    const now = new Date();

    /** 🔍 Find all active offers containing this vehicleId */
    const offers = await Offer.find({
      status: true,
      start_datetime: { $lte: now },
      end_datetime: { $gte: now },
      vehicle_id: { $elemMatch: { $eq: new mongoose.Types.ObjectId(vehicleId) } }
    }).lean();

    if (!offers || offers.length === 0) {
      return responseManager.onSuccess("No active offers available for this vehicle", [], res);
    }

    /** ✅ Filter based on city restriction (from/to match) */
    let filteredOffers = offers.filter(offer => {
      // If no restriction, offer valid for all cities
      if (!offer.city_location_restriction || offer.city_location_restriction.length === 0) {
        return true;
      }

      // Match 'from' or 'to'
      const cityMatched = offer.city_location_restriction.some(c =>
        c.toLowerCase() === from.toLowerCase() || c.toLowerCase() === to.toLowerCase()
      );

      return cityMatched;
    });

    /** 🔍 Apply search filter if search query is provided */
    if (search && search.trim() !== "") {
      const searchLower = search.toLowerCase();
      filteredOffers = filteredOffers.filter(offer =>
        offer.offer_code && offer.offer_code.toLowerCase().includes(searchLower)
      );
    }

    if (filteredOffers.length === 0) {
      return responseManager.onSuccess("No offers applicable for this route or search", [], res);
    }

    return responseManager.onSuccess("Offers fetched successfully", filteredOffers, res);

  } catch (err) {
    console.error("Error in getVehiclesOffers:", err);
    return responseManager.onError(err, res);
  }
};

exports.applyOffer = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (!(req.user && mongoose.Types.ObjectId.isValid(req.user._id))) {
      return responseManager.unauthorisedRequest(res);
    }

    const userId = req.user._id;
    const { offerId, offer_code, exploreCabId } = req.body;

    if ((!offerId || !mongoose.Types.ObjectId.isValid(offerId)) && !offer_code) {
      return responseManager.badrequest({ message: "Valid offerId or offer_code required" }, res);
    }

    if (!exploreCabId || !mongoose.Types.ObjectId.isValid(exploreCabId)) {
      return responseManager.badrequest({ message: "Valid exploreCabId required" }, res);
    }

    const now = new Date();

    /** 🔍 Find the offer */
    const offerQuery = { status: true, start_datetime: { $lte: now }, end_datetime: { $gte: now } };
    if (offerId && mongoose.Types.ObjectId.isValid(offerId)) offerQuery._id = offerId;
    else if (offer_code) offerQuery.offer_code = offer_code;

    const offer = await Offer.findOne(offerQuery).lean();
    if (!offer) return responseManager.onSuccess("Offer not available or not applicable at this time", {}, res);

    /** 🔍 Fetch user */
    const user = await User.findById(userId).lean();
    if (!user) return responseManager.badrequest({ message: "User not found" }, res);

    /** 🔍 Fetch ExploreCab Data AND populate tripId */
    const exploreCab = await ExploreCabs.findOne({ _id: exploreCabId, userId })
      .populate({
        path: "tripId",
        select: "priceCalculation totalPrice",
      })
      .lean();
    if (!exploreCab) return responseManager.badrequest({ message: "ExploreCab data not found" }, res);

    /** 🔹 Calculate total price dynamically from populated tripId */
    let totalPrice = 0;
    if (exploreCab.tripId && exploreCab.tripId.priceCalculation && exploreCab.tripId.priceCalculation.length > 0) {
      totalPrice = exploreCab.tripId.priceCalculation.reduce((sum, pc) => sum + (pc.totalPrice || 0), 0);
    } else if (exploreCab.tripId && exploreCab.tripId.totalPrice) {
      totalPrice = exploreCab.tripId.totalPrice; // fallback if no priceCalculation array
    }

    /** 🔹 Calculate discount */
    let discountAmount = 0;
    if (offer.discount_type === "%") discountAmount = (totalPrice * offer.discount_value) / 100;
    else if (offer.discount_type === "Flat") discountAmount = offer.discount_value;

    if (discountAmount > totalPrice) discountAmount = totalPrice;
    const finalPrice = totalPrice - discountAmount;

    /** 🔹 Update ExploreCab */
    await ExploreCabs.findByIdAndUpdate(exploreCabId, {
      $set: {
        applied_offer: offer._id,
        offer_code: offer.offer_code,
        discount_amount: discountAmount,
        final_price: finalPrice,
        total_price: totalPrice,
      },
    });

    /** 🔹 Prepare response */
    const responseData = {
      user,
      exploreCab: {
        ...exploreCab,
        applied_offer: offer,
        discount_amount: discountAmount,
        final_price: finalPrice,
        total_price: totalPrice,
      },
      offer,
    };

    return responseManager.onSuccess("Offer applied successfully", responseData, res);

  } catch (err) {
    console.error("Error in applyOffer:", err);
    return responseManager.onError(err, res);
  }
};


exports.getAllSpecialServices = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // 🔒 Optional: User authentication check
    if (!(req.user && mongoose.Types.ObjectId.isValid(req.user._id))) {
      return responseManager.unauthorisedRequest(res);
    }

    /** 🔍 Fetch all active special services */
    const services = await SpecialServices.find({ status: true })
      .sort({ createdAtTimestamp: -1 }) // latest first
      .lean();

    if (!services || services.length === 0) {
      return responseManager.onSuccess("No special services found", [], res);
    }

    /** 🔹 Return list */
    return responseManager.onSuccess("Special services fetched successfully", services, res);

  } catch (err) {
    console.error("Error in getAllSpecialServices:", err);
    return responseManager.onError(err, res);
  }
};
exports.selectVehicle = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // 🔒 Authentication Check
    if (!(req.user && mongoose.Types.ObjectId.isValid(req.user._id))) {
      return responseManager.unauthorisedRequest(res);
    }

    const { vehicleId, exploreCabId } = req.body;

    // 🔍 Validation
    if (!vehicleId || !mongoose.Types.ObjectId.isValid(vehicleId)) {
      return responseManager.badrequest({ message: "Valid vehicleId required" }, res);
    }
    if (!exploreCabId || !mongoose.Types.ObjectId.isValid(exploreCabId)) {
      return responseManager.badrequest({ message: "Valid exploreCabId required" }, res);
    }

    /** ===== Fetch User ===== **/
    const user = await User.findById(req.user._id)
      .select("name email mobile profile_image")
      .lean();
    if (!user) {
      return responseManager.badrequest({ message: "User not found" }, res);
    }

    /** ===== Fetch Vehicle ===== **/
    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      status: true,
    })
      .populate("vehicle_type") // get full type info
      .lean();

    if (!vehicle) {
      return responseManager.badrequest({ message: "Vehicle not found or inactive" }, res);
    }

    /** ===== Fetch ExploreCab Data ===== **/
    const exploreCab = await ExploreCabs.findOne({
      _id: exploreCabId,
      userId: req.user._id,
    })
      .populate({
        path: "tripId",
        populate: { path: "vehicleIds" },
      })
      .populate("vehicleIds") // populate related vehicles if any
      .populate("selected_vehicle") // if already selected
      .lean();

    if (!exploreCab) {
      return responseManager.badrequest({ message: "ExploreCab data not found" }, res);
    }

    /** ===== Update ExploreCab (mark selected vehicle) ===== **/
    await ExploreCabs.findByIdAndUpdate(exploreCabId, {
      $set: { selected_vehicle: vehicleId },
    });

    /** ===== Re-fetch updated ExploreCab (with selected vehicle populated) ===== **/
    const updatedExploreCab = await ExploreCabs.findById(exploreCabId)
      .populate({
        path: "tripId",
        populate: { path: "vehicleIds" },
      })
      .populate("vehicleIds")
      .populate("selected_vehicle")
      .lean();

    /** ===== Merge all data ===== **/
    const responseData = {
      message: "Vehicle selected successfully",
      user,
      exploreCab: updatedExploreCab, // ✅ updated + full populated data
      vehicle,
    };

    /** ===== Send Response ===== **/
    return responseManager.onSuccess(
      "Vehicle and ExploreCab data fetched successfully",
      responseData,
      res
    );

  } catch (err) {
    console.error("Error in selectVehicle:", err);
    return responseManager.onError(err, res);
  }
};
exports.createBooking = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // 🔒 User authentication check
    if (!(req.user && mongoose.Types.ObjectId.isValid(req.user._id))) {
      return responseManager.unauthorisedRequest(res);
    }

    const {
      trip_type,
      from,
      to,
      city,
      date,
      pickup_time,
      vehicleId,
      pickup_address,
      drop_address,
      traveler_name,
      traveler_email,
      traveler_mobile,
      special_services,
      offers_id,
      company_name,
      gst_no,
      payment_mode,
      is_gst,
      payment_type,
      payment_id,
      sub_total_payment,  // NOW FRONTEND CALCULATES
      total_payment       // NOW FRONTEND CALCULATES
    } = req.body;

    /** ===== Validation ===== **/
    if (!trip_type) return responseManager.badrequest({ message: "Trip type required" }, res);
    if (!date || !pickup_time) return responseManager.badrequest({ message: "Pickup date & time required" }, res);
    if (!vehicleId) return responseManager.badrequest({ message: "Vehicle required" }, res);
    if (!pickup_address || !traveler_name || !traveler_email || !traveler_mobile) {
      return responseManager.badrequest({ message: "Traveler details missing" }, res);
    }

    // GST validation
    if (is_gst === 1) {
      if (!company_name) return responseManager.badrequest({ message: "Company name required when GST is applied" }, res);
      if (!gst_no) return responseManager.badrequest({ message: "GST number required when GST is applied" }, res);
    }

    // Payment type validation
    if (payment_type === 1) {
      if (!payment_id) return responseManager.badrequest({ message: "Payment ID required for online payment" }, res);
    }

    /** ===== Find Trip ===== **/
    let query = { status: true, trip_type: trip_type };
    if (trip_type === "Oneway" || trip_type === "Round Trip") {
      query.from = new RegExp(`^${from.trim()}$`, "i");
      query.to = new RegExp(`^${to.trim()}$`, "i");
    } else if (trip_type === "Local Rental Trip") {
      query.city = new RegExp(`^${city.trim()}$`, "i");
    }

    const trip = await Trip.findOne(query).lean();
    if (!trip) return responseManager.badrequest({ message: "No trip found for this route" }, res);

    /** ===== Vehicle ===== **/
    const vehicle = await Vehicle.findById(vehicleId).lean();
    if (!vehicle) return responseManager.badrequest({ message: "Invalid vehicle" }, res);

    /** ===== Special Services ===== **/
    let servicesFullData = [];
    let serviceIds = [];

    if (special_services && special_services.length > 0) {
      serviceIds = special_services.map(s => s.service_id || s);
      servicesFullData = await SpecialServices.find({ _id: { $in: serviceIds }, status: true }).lean();
    }

    /** ===== Offer Apply ===== **/
    let appliedOffer = null;
    if (offers_id && mongoose.Types.ObjectId.isValid(offers_id)) {
      appliedOffer = await Offer.findById(offers_id).lean();
    }

    /** ===== Validate Frontend Calculated Values ===== **/
    let validSubTotal = Number(sub_total_payment) || 0;
    let validTotal = Number(total_payment) || 0;
    if (validSubTotal < 0 || validTotal < 0) {
      return responseManager.badrequest({ message: "Invalid payment values sent from frontend" }, res);
    }
  /** ===== Generate Unique Booking ID ===== **/
    const generateBookingId = () => {
      const prefix = "BBM";
      const timestamp = Date.now().toString().slice(-6); // last 6 digits
      const random = Math.floor(1000 + Math.random() * 9000); // random 4 digits
      return `${prefix}${timestamp}${random}`;
    };
    /** ===== Save Booking ===== **/
    const bookingData = {
      userId: req.user._id,
        trip_type,
      booking_id: generateBookingId(),
      from,
      to,
      city,
      date,
      pickup_time,
      vehicleId,
      vehicleName: vehicle.name,
      pickup_address,
      drop_address,
      traveler_name,
      traveler_email,
      traveler_mobile,
      offers_id: appliedOffer ? appliedOffer._id : null,
      special_services: serviceIds,
      company_name,
      gst_no,
      is_gst: is_gst || 0,
      payment_type: payment_type || 0,
      payment_id: payment_id || null,
      sub_total_payment: validSubTotal,  // FRONTEND VALUE
      total_payment: validTotal,        // FRONTEND VALUE
      payment_mode: payment_mode || "Online",
      payment_status: "Pending",
        booking_status: "Confirmed",
        razorpay_payment: req.body.razorpay_payment || null
    };

    const booking = new Booking(bookingData);
    await booking.save();

    /** ===== Response ===== **/
    return responseManager.onSuccess("Your car booking Is Confirmed!", {
      booking,
      vehicle,
      offer: appliedOffer,
      special_services: servicesFullData
    }, res);

  } catch (err) {
    console.error("Error in createBooking:", err);
    return responseManager.onError(err, res);
  }
};

