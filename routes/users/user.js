const express = require("express");
const router = express.Router();
const helper = require("../../utilities/helper");
const multer = require("../../utilities/multer.functions");
const UserController = require("../../controllers/Users/users.controller");
const verifyUser = require("../../controllers/Users/verifyUser");
const {  explorweCabsGetAvailableVehicles, createBooking, getVehiclesOffers, applyOffer, getAllSpecialServices, selectVehicle, createTravelDetails, createBookingFromTravelDetails } = require("../../controllers/Users/booking.controller");




router.post(
  "/signup",
  multer.memoryUpload.fields([
    { name: "profile_image", maxCount: 1 },
  ]),
  UserController.registerUserOtp
);


router.put(
  "/update-profile",
  multer.memoryUpload.fields([
    { name: "profile_image", maxCount: 1 },
  ]),
  verifyUser,
  UserController.updateProfile
);
router.post(
  "/signup-otp-verify",

  UserController.verifyOtpSignup


);

router.get("/profile",verifyUser,UserController.getProfile)
router.post("/apply/offer",verifyUser,applyOffer)
router.post("/select-vehicle",verifyUser,selectVehicle)
router.get("/get-vehicles-offers",verifyUser,getVehiclesOffers)
router.get("/special-services",verifyUser,getAllSpecialServices)
router.post("/logout",verifyUser,UserController.logout)
router.post("/explore-cab",verifyUser,explorweCabsGetAvailableVehicles)
router.post("/create-travel-details",verifyUser,createTravelDetails)
router.post("/create-booking",verifyUser,createBookingFromTravelDetails)

router.post(
  "/google-signup",

  UserController.googleSignup
);
router.post(
  "/google-login",

  UserController.googleLogin
);
router.post(
  "/send-otp",

  UserController.requestOtp
);
router.post(
  "/verify-otp",

  UserController.verifyOtp
);


module.exports = router;