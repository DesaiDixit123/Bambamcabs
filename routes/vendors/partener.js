const express = require("express");
const { registerVendorPartner, verifyOtp,resendOtp } = require("../../controllers/admins/vendors/VendorPartener");


const router = express.Router();

router.post("/partner/register", registerVendorPartner);

// Verify OTP
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);


module.exports = router;
