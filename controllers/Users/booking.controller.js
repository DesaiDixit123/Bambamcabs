const mongoose = require("mongoose");
const responseManager = require("../../utilities/response.manager");
const Trip = require("../../models/tripsData.model");
const Vehicle = require("../../models/vehicles.model");
const Offer = require("../../models/Admin/Master/Offer.model");
const TravelDetails = require("../../models/User/travel_details.model");
const User = require('../../models/User/user.model'); // user model
const Explore = require('../../models/User/exploreCabs.model'); // user model
const axios = require('axios');
const SpecialServices = require("../../models/Admin/Master/Special_Services.model"); // tamaro model path
const ExploreCabs = require("../../models/User/exploreCabs.model");
const Booking = require("../../models/User/booking.model");


// exports.explorweCabsGetAvailableVehicles = async (req, res) => {
//   try {
//     res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
//     res.setHeader("Access-Control-Allow-Origin", "*");

//     // 🔒 Authentication
//     if (!(req.user && mongoose.Types.ObjectId.isValid(req.user._id))) {
//       return responseManager.unauthorisedRequest(res);
//     }

//     const { from, to, pickup_date, pickup_time, trip_type, city } = req.body;

//     /** ===== Validation ===== **/
//     if (!trip_type)
//       return responseManager.badrequest({ message: "Trip type is required" }, res);

//     if ((trip_type === "Oneway" || trip_type === "Round Trip") && (!from || !to))
//       return responseManager.badrequest({ message: "From & To required" }, res);

//     if (trip_type === "Local Rental Trip" && !city)
//       return responseManager.badrequest({ message: "City required for local rental trip" }, res);

//     if (!pickup_date || !pickup_time)
//       return responseManager.badrequest({ message: "Pickup date & time required" }, res);

//     /** ===== Handle Multi-location Round Trip ===== **/
//     let total_km_count = 0;

//     if (trip_type === "Round Trip") {
//       const apiKey = "EbB1WBtNMWSaC4nq5A6wQgudF8rp5MKHt8IZ4iQFouwtANcDhhXIkp6rDT39PkIk";
//       const toArray = Array.isArray(to) ? to : [to]; // ensure array

//       const allPoints = [from, ...toArray, from]; // return back to origin
//       console.log("🗺️ Route Points:", allPoints);

//       for (let i = 0; i < allPoints.length - 1; i++) {
//         const origin = allPoints[i];
//         const destination = allPoints[i + 1];

//         const url = `https://api.distancematrix.ai/maps/api/distancematrix/json?origins=${encodeURIComponent(
//           origin
//         )}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

//         const response = await axios.get(url);
//         const element = response.data?.rows?.[0]?.elements?.[0];

//         if (!element || element.status !== "OK") {
//           console.warn(`⚠️ Distance API failed for ${origin} → ${destination}`);
//           continue;
//         }

//         const distanceMeters = element.distance.value;
//         const distanceKm = distanceMeters / 1000;
//         total_km_count += distanceKm;

//         console.log(`🛣️ ${origin} → ${destination} = ${distanceKm.toFixed(2)} km`);
//       }

//       total_km_count = Math.round(total_km_count);
//       console.log(`✅ Total Round Trip Distance: ${total_km_count} km`);
//     }

//     /** ===== Build Query ===== **/
//     const query = { status: true, trip_type: trip_type.trim() };

//     if (trip_type === "Oneway" || trip_type === "Round Trip") {
//       query.from = new RegExp(`^${from.trim()}$`, "i");

//       if (Array.isArray(to) && to.length > 0) {
//         query.$or = to.map((dest) => ({ to: new RegExp(`^${dest.trim()}$`, "i") }));
//       } else {
//         query.to = new RegExp(`^${to.trim()}$`, "i");
//       }
//     } else if (trip_type === "Local Rental Trip") {
//       query.city = new RegExp(`^${city.trim()}$`, "i");
//     }

//     /** ===== Find Trip ===== **/
//     const trip = await Trip.findOne(query).lean();
//     let vehicles = [];
//     let is_result_found = false;

//     let upto_km = null;
//     let fix_price_per_day = 0;
//     let per_km_price = 0;
//     let per_hour_price = 0;
//     let final_price = 0;

//     if (trip) {
//       console.log("✅ Trip found:", trip._id);

//       if (trip.vehicleIds && trip.vehicleIds.length > 0) {
//         vehicles = await Vehicle.find({
//           vehicle_type: { $in: trip.vehicleIds },
//           status: true,
//         })
//           .populate("vehicle_type")
//           .lean();

//         console.log("🚗 Vehicles found:", vehicles.length);
//       }
//       is_result_found = true;
//     } else {
//       console.log("⚠️ No trip found for query:", query);
//     }

//     /** ===== Calculate Prices ===== **/
//     if (vehicles.length > 0) {
//       outerLoop: for (const v of vehicles) {
//         if (!v.vehicle_type?.states?.length) continue;

//         for (const state of v.vehicle_type.states) {
//           if (!Array.isArray(state.cities)) continue;

//           for (const cityData of state.cities) {
//             const cityName = cityData?.city_name;

//             // 🟢 Local Rental Trip Logic
//             if (trip_type === "Local Rental Trip") {
//               if (cityName && city && cityName.toLowerCase() === city.toLowerCase()) {
//                 per_hour_price = cityData.per_hour_price || 0;
//                 fix_price_per_day = cityData.fix_price_per_day || 0;
//                 final_price = per_hour_price;
//                 console.log(`🏙️ Local city match: ${cityName}`);
//                 break outerLoop;
//               }
//             }

//             // 🟢 Oneway / Round Trip Logic
//             if (trip_type === "Oneway" || trip_type === "Round Trip") {
//               if (cityName && from && cityName.toLowerCase() === from.toLowerCase()) {
//                 upto_km = cityData.upto_km || 0;
//                 fix_price_per_day = cityData.fix_price_per_day || 0;
//                 per_km_price = cityData.per_km_price || 0;

//                 const totalKmUsed =
//                   trip_type === "Round Trip" ? total_km_count : trip?.totalKm || 0;

//                 if (totalKmUsed <= upto_km) {
//                   final_price = fix_price_per_day;
//                 } else {
//                   const extraKm = totalKmUsed - upto_km;
//                   final_price = fix_price_per_day + extraKm * per_km_price;
//                 }

//                 console.log(`✅ City match: ${cityName}`);
//                 console.log(`💰 Final Price: ${final_price}`);
//                 break outerLoop;
//               }
//             }
//           }
//         }
//       }
//     }

//     /** ===== Save Explore Data ===== **/
//     const exploreData = new ExploreCabs({
//       userId: req.user._id,
//       trip_type,
//       from,
//       to: Array.isArray(to) ? to : [to],
//       city,
//       pickup_date,
//       pickup_time,
//       tripId: trip ? trip._id : null,
//       totalKm: trip ? trip.totalKm : null,
//       total_km_count: total_km_count || null, // ✅ for round trip
//       duration: trip ? trip.duration : null,
//       vehicleIds: vehicles.map((v) => v._id),
//       is_result_found,
//       upto_km,
//       fix_price_per_day,
//       per_km_price,
//       per_hour_price,
//       final_price,
//     });

//     await exploreData.save();
//     console.log("💾 ExploreCabs saved successfully:", exploreData._id);

//     /** ===== Response ===== **/
//     const responseData = {
//       trip,
//       vehicles,
//       exploreId: exploreData._id,
//       total_km_count: total_km_count || 0,
//       total_km: trip ? trip.totalKm : 0,
//       upto_km,
//       fix_price_per_day,
//       per_km_price,
//       per_hour_price,
//       final_price,
//     };

//     return responseManager.onSuccess(
//       `${trip_type} trip ${is_result_found ? "found" : "not found"}`,
//       responseData,
//       res
//     );
//   } catch (err) {
//     console.error("🔥 Error in explorweCabsGetAvailableVehicles:", err);
//     return responseManager.onError(err, res);
//   }
// };




exports.explorweCabsGetAvailableVehicles = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // 🔒 Authentication
    if (!(req.user && mongoose.Types.ObjectId.isValid(req.user._id))) {
      return responseManager.unauthorisedRequest(res);
    }

    const { from, to, pickup_date, pickup_time, trip_type, city } = req.body;

    /** ===== Validation ===== **/
    if (!trip_type) return responseManager.badrequest({ message: "Trip type is required" }, res);

    if ((trip_type === "Oneway" || trip_type === "Round Trip") && (!from || !to)) {
      return responseManager.badrequest({ message: "From & To required" }, res);
    }

    if (trip_type === "Round Trip" && !Array.isArray(to)) {
      return responseManager.badrequest({ message: "To must be an array for Round Trip" }, res);
    }

    if (trip_type === "Local Rental Trip" && !city) {
      return responseManager.badrequest({ message: "City required for local rental trip" }, res);
    }

    if (!pickup_date || !pickup_time) return responseManager.badrequest({ message: "Pickup date & time required" }, res);

    /** ===== Find Trips ===== **/
    let tripsFound = [];
    let total_km_count = 0;

    if (trip_type === "Oneway") {
      const query = { 
        status: true, 
        trip_type: "Oneway", 
        from: new RegExp(`^${from.trim()}$`, "i"), 
        to: new RegExp(`^${to.trim()}$`, "i") 
      };
      const trip = await Trip.findOne(query).lean();
      if (trip) tripsFound.push(trip);
    } else if (trip_type === "Round Trip") {
      const apiKey = "EbB1WBtNMWSaC4nq5A6wQgudF8rp5MKHt8IZ4iQFouwtANcDhhXIkp6rDT39PkIk";

      for (const destination of to) {
        const query = { 
          status: true, 
          trip_type: "Round Trip", 
          from: new RegExp(`^${from.trim()}$`, "i"), 
          to: new RegExp(`^${destination.trim()}$`, "i") 
        };
        const trip = await Trip.findOne(query).lean();
        if (trip) tripsFound.push(trip);

        // Calculate distance for this segment
        const url = `https://api.distancematrix.ai/maps/api/distancematrix/json?origins=${encodeURIComponent(from)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;
        const response = await axios.get(url);
        const element = response.data?.rows?.[0]?.elements?.[0];
        if (element && element.status === "OK") {
          total_km_count += element.distance.value / 1000;
        }
      }

      // Add return trip distance (last destination → from)
      if (to.length > 0) {
        const lastDestination = to[to.length - 1];
        const urlReturn = `https://api.distancematrix.ai/maps/api/distancematrix/json?origins=${encodeURIComponent(lastDestination)}&destinations=${encodeURIComponent(from)}&key=${apiKey}`;
        const responseReturn = await axios.get(urlReturn);
        const elementReturn = responseReturn.data?.rows?.[0]?.elements?.[0];
        if (elementReturn && elementReturn.status === "OK") {
          total_km_count += elementReturn.distance.value / 1000;
        }
      }

      total_km_count = Math.round(total_km_count);
    } else if (trip_type === "Local Rental Trip") {
      const query = { 
        status: true, 
        trip_type: "Local Rental Trip", 
        city: new RegExp(`^${city.trim()}$`, "i") 
      };
      const trip = await Trip.findOne(query).lean();
      if (trip) tripsFound.push(trip);
    }

    /** ===== Merge vehicles and calculate prices ===== **/
    let vehicles = [];
    let is_result_found = tripsFound.length > 0;
    let upto_km = null;
    let fix_price_per_day = 0;
    let per_km_price = 0;
    let per_hour_price = 0;
    let final_price = 0;

    if (is_result_found) {
      for (const trip of tripsFound) {
        if (trip.vehicleIds && trip.vehicleIds.length > 0) {
          const vList = await Vehicle.find({ vehicle_type: { $in: trip.vehicleIds }, status: true })
            .populate("vehicle_type")
            .lean();
          vehicles = vehicles.concat(vList);
        }
      }

      // Remove duplicate vehicles
      vehicles = vehicles.filter((v, i, arr) => arr.findIndex(a => a._id.toString() === v._id.toString()) === i);

      // Calculate prices for first trip (can be adjusted for multiple trips if needed)
      const firstTrip = tripsFound[0];
      outerLoop: for (const v of vehicles) {
        if (!v.vehicle_type?.states?.length) continue;

        for (const state of v.vehicle_type.states) {
          if (!Array.isArray(state.cities)) continue;

          for (const cityData of state.cities) {
            const cityName = cityData?.city_name;

            if (trip_type === "Local Rental Trip") {
              if (cityName && city && cityName.toLowerCase() === city.toLowerCase()) {
                per_hour_price = cityData.per_hour_price || 0;
                fix_price_per_day = cityData.fix_price_per_day || 0;
                final_price = per_hour_price;
                break outerLoop;
              }
            } else {
              if (cityName && from && cityName.toLowerCase() === from.toLowerCase()) {
                upto_km = cityData.upto_km || 0;
                fix_price_per_day = cityData.fix_price_per_day || 0;
                per_km_price = cityData.per_km_price || 0;

                const totalKmUsed = trip_type === "Round Trip" ? total_km_count : firstTrip.totalKm || 0;
                if (totalKmUsed <= upto_km) final_price = fix_price_per_day;
                else final_price = fix_price_per_day + (totalKmUsed - upto_km) * per_km_price;
                break outerLoop;
              }
            }
          }
        }
      }
    }

    /** ===== Save Explore Data ===== **/
    const exploreData = new ExploreCabs({
      userId: req.user._id,
      trip_type,
      from,
      to: Array.isArray(to) ? to : [to],
      city,
      pickup_date,
      pickup_time,
      tripId: tripsFound[0]?._id || null,
      totalKm: tripsFound[0]?.totalKm || null,
      total_km_count: total_km_count || null,
      duration: tripsFound[0]?.duration || null,
      vehicleIds: vehicles.map(v => v._id),
      is_result_found,
      upto_km,
      fix_price_per_day,
      per_km_price,
      per_hour_price,
      final_price,
    });

    await exploreData.save();

    /** ===== Response ===== **/
    const responseData = {
      trips: tripsFound,
      vehicles,
      exploreId: exploreData._id,
      total_km_count: total_km_count || 0,
      total_km: tripsFound[0]?.totalKm || 0,
      upto_km,
      fix_price_per_day,
      per_km_price,
      per_hour_price,
      final_price,
    };

    return responseManager.onSuccess(
      `${trip_type} trip ${is_result_found ? "found" : "not found"}`,
      responseData,
      res
    );

  } catch (err) {
    console.error("🔥 Error in explorweCabsGetAvailableVehicles:", err);
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
// exports.createBooking = async (req, res) => {
//   try {
//     res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
//     res.setHeader("Access-Control-Allow-Origin", "*");

//     // 🔒 User authentication check
//     if (!(req.user && mongoose.Types.ObjectId.isValid(req.user._id))) {
//       return responseManager.unauthorisedRequest(res);
//     }

//     const {
//       trip_type,
//       from,
//       to,
//       city,
//       date,
//       pickup_time,
//       vehicleId,
//       pickup_address,
//       drop_address,
//       traveler_name,
//       traveler_email,
//       traveler_mobile,
//       special_services,
//       offers_id,
//       exploreId
//     } = req.body;

//     /** ===== Validation ===== **/
//     if (!trip_type) return responseManager.badrequest({ message: "Trip type required" }, res);
//     if (!date || !pickup_time) return responseManager.badrequest({ message: "Pickup date & time required" }, res);
//     if (!vehicleId) return responseManager.badrequest({ message: "Vehicle required" }, res);
//     if (!pickup_address || !traveler_name || !traveler_email || !traveler_mobile) {
//       return responseManager.badrequest({ message: "Traveler details missing" }, res);
//     }
//     if (!exploreId || !mongoose.Types.ObjectId.isValid(exploreId)) {
//       return responseManager.badrequest({ message: "Explore ID is missing or invalid" }, res);
//     }

//     /** ===== Find Trip ===== **/
//     let query = { status: true, trip_type: trip_type };
//     if (trip_type === "Oneway" || trip_type === "Round Trip") {
//       query.from = new RegExp(`^${from.trim()}$`, "i");
//       query.to = new RegExp(`^${to.trim()}$`, "i");
//     } else if (trip_type === "Local Rental Trip") {
//       query.city = new RegExp(`^${city.trim()}$`, "i");
//     }

//     const trip = await Trip.findOne(query).lean();
//     if (!trip) return responseManager.badrequest({ message: "No trip found for this route" }, res);

//     /** ===== Vehicle ===== **/
//     const vehicle = await Vehicle.findById(vehicleId).lean();
//     if (!vehicle) return responseManager.badrequest({ message: "Invalid vehicle" }, res);

//     /** ===== Explore Data ===== **/
//     const exploreData = await Explore.findById(exploreId).lean();
//     if (!exploreData) return responseManager.badrequest({ message: "Invalid Explore ID" }, res);

//     const baseFare = Number(exploreData.fix_price_per_day) || 0;
//     const kmIncluded = Number(exploreData.totalkm) || 0;

//     /** ===== Special Services ===== **/
//     let servicesFullData = [];
//     let serviceIds = [];

//     if (special_services && special_services.length > 0) {
//       serviceIds = special_services.map(s => s.service_id || s);
//       servicesFullData = await SpecialServices.find({ _id: { $in: serviceIds }, status: true }).lean();
//     }

//     /** ===== Offer Apply ===== **/
//     let appliedOffer = null;
//     if (offers_id && mongoose.Types.ObjectId.isValid(offers_id)) {
//       appliedOffer = await Offer.findById(offers_id).lean();
//     }

//     /** ===== Generate Unique Booking ID ===== **/
//     const generateBookingId = () => {
//       const prefix = "BBM";
//       const timestamp = Date.now().toString().slice(-6); // last 6 digits
//       const random = Math.floor(1000 + Math.random() * 9000); // random 4 digits
//       return `${prefix}${timestamp}${random}`;
//     };

//     /** ===== Save Booking ===== **/
//     const travelDetailsData = {
//       userId: req.user._id,
//       trip_type,
//       booking_id: generateBookingId(),
//       from,
//       to,
//       city,
//       date,
//       pickup_time,
//       vehicleId,
//       vehicleName: vehicle.name,
//       exploreId,
//       base_fare: baseFare,
//       km_included: kmIncluded,
//       pickup_address,
//       drop_address,
//       traveler_name,
//       traveler_email,
//       traveler_mobile,
//       offers_id: appliedOffer ? appliedOffer._id : null,
//       special_services: serviceIds,
//       booking_status: "Confirmed"
//     };

//     const booking = new Booking(travelDetailsData);
//     await booking.save();

//     /** ===== Response ===== **/
//     return responseManager.onSuccess("Your car booking is confirmed!", {
//       booking,
//       vehicle,
//       offer: appliedOffer,
//       special_services: servicesFullData,
//       explore: exploreData
//     }, res);

//   } catch (err) {
//     console.error("Error in createBooking:", err);
//     return responseManager.onError(err, res);
//   }
// };




exports.createTravelDetails = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // 🔒 Authentication
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
      exploreId
    } = req.body;

    /** ===== Validation ===== **/
    if (!trip_type) return responseManager.badrequest({ message: "Trip type required" }, res);
    if (!date || !pickup_time) return responseManager.badrequest({ message: "Pickup date & time required" }, res);
    if (!vehicleId) return responseManager.badrequest({ message: "Vehicle required" }, res);
    if (!pickup_address || !traveler_name || !traveler_email || !traveler_mobile) {
      return responseManager.badrequest({ message: "Traveler details missing" }, res);
    }
    if (!exploreId || !mongoose.Types.ObjectId.isValid(exploreId)) {
      return responseManager.badrequest({ message: "Explore ID is missing or invalid" }, res);
    }

    /** ===== Vehicle & Explore Data ===== **/
    const vehicle = await Vehicle.findById(vehicleId).lean();
    if (!vehicle) return responseManager.badrequest({ message: "Invalid vehicle" }, res);

    const exploreData = await Explore.findById(exploreId).lean();
    if (!exploreData) return responseManager.badrequest({ message: "Invalid Explore ID" }, res);

    const fix_price_per_day = Number(exploreData.fix_price_per_day) || 0;
    const upto_km = Number(exploreData.upto_km) || 0;
    const per_km_price = Number(exploreData.per_km_price) || 0;

    /** ===== Special Services ===== **/
    let servicesFullData = [];
    let serviceIds = [];
    let totalServicePrice = 0;

    if (special_services && special_services.length > 0) {
      serviceIds = special_services.map(s => s.service_id || s);
      servicesFullData = await SpecialServices.find({ _id: { $in: serviceIds }, status: true }).lean();


      console.log("servicesFullData:", servicesFullData)
      totalServicePrice = servicesFullData.reduce((sum, s) => sum + (s.amount || 0), 0);
    }

    /** ===== DistanceMatrix API Call ===== **/
    let actualDistanceKm = 0;
    try {
      const apiKey = 'EbB1WBtNMWSaC4nq5A6wQgudF8rp5MKHt8IZ4iQFouwtANcDhhXIkp6rDT39PkIk'; // replace with your API key
      const url = `https://api.distancematrix.ai/maps/api/distancematrix/json?origins=${encodeURIComponent(pickup_address)}&destinations=${encodeURIComponent(drop_address)}&key=${apiKey}`;
      const response = await axios.get(url);

      if (
        response.data &&
        response.data.rows &&
        response.data.rows[0].elements &&
        response.data.rows[0].elements[0].status === 'OK'
      ) {
        actualDistanceKm = response.data.rows[0].elements[0].distance.value / 1000;
      } else {
        console.warn("DistanceMatrix API returned invalid data:", response.data);
      }
    } catch (err) {
      console.error("DistanceMatrix API error:", err);
    }

    /** ===== Calculate Extra KM & Base Price ===== **/
    const extraKm = Math.max(0, actualDistanceKm - upto_km);
    let basePrice = fix_price_per_day + extraKm * per_km_price + totalServicePrice;

    /** ===== Offer Handling ===== **/
    let appliedOffer = null;
    let offerDiscount = 0;

    if (offers_id && mongoose.Types.ObjectId.isValid(offers_id)) {
      appliedOffer = await Offer.findById(offers_id).lean();

      if (appliedOffer && appliedOffer.discount_value) {
        if (appliedOffer.discount_type === "%") {
          offerDiscount = (basePrice * Number(appliedOffer.discount_value)) / 100;
        } else {
          offerDiscount = Number(appliedOffer.discount_value);
        }
      }
    }

    /** ===== Final Price ===== **/
    let final_price = Math.max(0, basePrice - offerDiscount);

    /** ===== Generate Booking ID ===== **/
    const generateBookingId = () => {
      const prefix = "BBM";
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(1000 + Math.random() * 9000);
      return `${prefix}${timestamp}${random}`;
    };

    /** ===== Save Booking ===== **/
    const travelDetailsData = {
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
      exploreId,
      base_fare: fix_price_per_day,
      km_included: upto_km,
      pickup_address,
      drop_address,
      actual_distance_km: actualDistanceKm,
      final_price,
      traveler_name,
      traveler_email,
      traveler_mobile,
      offers_id: appliedOffer ? appliedOffer._id : null,
      special_services: serviceIds,
      booking_status: "Confirmed"
    };

    const travel_deatils = new TravelDetails(travelDetailsData);
    await travel_deatils.save();

    /** ===== Response ===== **/
    return responseManager.onSuccess("Travel Details Saved", {
      travel_deatils,
      vehicle,
      offer: appliedOffer,
      special_services: servicesFullData,
      explore: exploreData,
      actual_distance_km: actualDistanceKm,
      total_service_price: totalServicePrice,
      offer_discount: offerDiscount,
      final_price
    }, res);

  } catch (err) {
    console.error("Error in createBooking:", err);
    return responseManager.onError(err, res);
  }
};

exports.createBookingFromTravelDetails = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const {
      travelDetailsId,
      company_name,
      gst_no,
      payment_type,
      payment_id,
      sub_total_payment,
      total_payment,
      razorpay_payment
    } = req.body;

    // 🔒 Authentication
    if (!(req.user && mongoose.Types.ObjectId.isValid(req.user._id))) {
      return responseManager.unauthorisedRequest(res);
    }

    // 🔹 Validation
    if (!travelDetailsId || !mongoose.Types.ObjectId.isValid(travelDetailsId)) {
      return responseManager.badrequest({ message: "Valid travelDetailsId is required" }, res);
    }

    // 🔹 Fetch TravelDetails
    const travelDetails = await TravelDetails.findById(travelDetailsId).lean();
    if (!travelDetails) {
      return responseManager.badrequest({ message: "TravelDetails not found" }, res);
    }

    // 🔹 Check GST requirement
    if (travelDetails.is_gst === 1) {
      if (!company_name && !travelDetails.company_name) {
        return responseManager.badrequest({ message: "Company name is required when GST is applied" }, res);
      }
      if (!gst_no && !travelDetails.gst_no) {
        return responseManager.badrequest({ message: "GST number is required when GST is applied" }, res);
      }
    }

    // 🔹 Validate payment_type & payment_id
    const paymentType = payment_type !== undefined ? payment_type : travelDetails.payment_type || 0;
    if (paymentType === 1 && !payment_id) {
      return responseManager.badrequest({ message: "Payment ID is required for online payments" }, res);
    }

    // 🔹 Set payment_mode automatically
    const paymentMode = paymentType === 1 ? "Online" : "Cash";

    /** ===== Generate Unique Booking ID ===== **/
    const generateBookingId = async () => {
      const lastBooking = await Booking.findOne({}).sort({ createdAt: -1 }).lean();
      let lastNumber = lastBooking ? parseInt(lastBooking.booking_id.replace("#BBM", "")) : 0;
      lastNumber++;
      return `#BBM${lastNumber.toString().padStart(7, "0")}`;
    };

    /** ===== Save Booking ===== **/
    const bookingData = new Booking({
      userId: req.user._id,
      travelDetailsId: travelDetails._id,
      company_name: company_name || travelDetails.company_name || "",
      gst_no: gst_no || travelDetails.gst_no || "",
      payment_mode: paymentMode,
      payment_type: paymentType,
      payment_id: payment_id || travelDetails.payment_id || "",
      sub_total_payment: paymentType === 1 ? sub_total_payment || 0 : 0,
      total_payment: paymentType === 1 ? total_payment || 0 : 0,
      razorpay_payment: paymentType === 1 ? razorpay_payment || {} : {},
      booking_id: await generateBookingId(),
      booking_status: "Confirmed"
    });

    const booking = await bookingData.save();

    /** ===== Response ===== **/
    return responseManager.onSuccess("Booking created successfully!", {
      booking,
      travelDetails
    }, res);

  } catch (err) {
    console.error("Error in createBookingFromTravelDetails:", err);
    return responseManager.onError(err, res);
  }
};
