const express = require("express");
const router = express.Router();
const helper = require("../../utilities/helper");
const multer = require("../../utilities/multer.functions");
const { registerCompanyVendor } = require("../../controllers/admins/vendors/vendors_register/Company/vendorCompany.controller");
const { registerIndividualVendor } = require("../../controllers/admins/vendors/vendors_register/Indivisual/vendorIndivisual.controller");
const { vendorLogin, getProfile } = require("../../controllers/admins/vendors/Vendor_Auth/Login/vendorLogin");
const { vendorLoginSendOtp } = require("../../controllers/admins/vendors/Vendor_Auth/Login/vendorLoginSendOtp");
const { vendorVerifyOtp } = require("../../controllers/admins/vendors/Vendor_Auth/Login/vendorVerifyOtp");
const { vendorResendOtp } = require("../../controllers/admins/vendors/Vendor_Auth/Login/vendorResendOtp");
const { vendorUpdatePassword } = require("../../controllers/admins/vendors/Vendor_Auth/Update_Password/vendorUpdatePassword");
const { vendorForgetCompanyPassword } = require("../../controllers/admins/vendors/Vendor_Auth/Forget_Password/vendorForgetCompanyPassword");
const { vendorForgetIndivisualPassword } = require("../../controllers/admins/vendors/Vendor_Auth/Forget_Password/vendorForgetIndivisualPassword");
const { updateCompanyVendor } = require("../../controllers/admins/vendors/vendors_register/Company/vendorCompanyUpdate.controller");
const { updateIndividualVendor } = require("../../controllers/admins/vendors/vendors_register/Indivisual/vendorIndivisualUpdate.controller");
const { vendorForgetIndivisualVerifyOtp } = require("../../controllers/admins/vendors/Vendor_Auth/Forget_Password/vendorForgetIndivisualVerifyOtp");
const { vendorVerifyCompanyOtp } = require("../../controllers/admins/vendors/Vendor_Auth/Forget_Password/vendorVerifyCompanyOtp");
const { vendorResetCompanyPassword } = require("../../controllers/admins/vendors/Vendor_Auth/Forget_Password/vendorResetCompanyPassword");
const { vendorForgetIndivisualResetPassword } = require("../../controllers/admins/vendors/Vendor_Auth/Forget_Password/vendorForgetIndivisualResetPassword");
const { getAllVendors, getAllVendorsWithPagination, getCompanyVendorsWithPagination, getIndividualVendorsWithPagination, getOneVendor } = require("../../controllers/admins/vendors/getVendor/get_all_vendor");
const { deleteVendor } = require("../../controllers/admins/vendors/Delete_Vendor/deleteVendor");
const { updateVendorStatus } = require("../../controllers/admins/vendors/vendorStatusUpdate/vendorUpdateStatus");
const verifyVendor = require("../../controllers/admins/vendors/Vendor_Auth/Login/verifyVendor");
const { getActiveVendorsWithPagination, getInactiveVendorsWithPagination } = require("../../controllers/admins/vendors/status/status");
const { vendorApproved } = require("../../controllers/admins/vendors/Vendor_Approved/vendorApproved");
const { vendorRejected } = require("../../controllers/admins/vendors/Vendor_Rejected/vendorRejected");


router.post(
  "/company/register",
  multer.memoryUpload.fields([
    { name: "owner_photo", maxCount: 1 },
    { name: "office_photo", maxCount: 1 },
    { name: "visiting_card", maxCount: 1 },
    { name: "business_license", maxCount: 1 },
    { name: "aadhar_pan", maxCount: 1 },
    { name: "gst_certificate", maxCount: 1 },
    { name: "electricity_bill", maxCount: 1 },
  ]),
  registerCompanyVendor
);
router.post(
  "/indivisual/register",
  multer.memoryUpload.fields([
    { name: "owner_photo", maxCount: 1 },
    { name: "office_photo", maxCount: 1 },
    { name: "visiting_card", maxCount: 1 },
    { name: "business_license", maxCount: 1 },
    { name: "aadhar_pan", maxCount: 1 },
    { name: "gst_certificate", maxCount: 1 },
    { name: "electricity_bill", maxCount: 1 },
  ]),
  registerIndividualVendor
);


router.post("/login",vendorLogin)
router.post("/send-otp",vendorLoginSendOtp)
router.post("/verify-otp",vendorVerifyOtp)
router.post("/resend-otp",vendorResendOtp)
router.post("/update-password",vendorUpdatePassword)
router.post("/company-forget-password",vendorForgetCompanyPassword)
router.post("/indivisual-forget-password", vendorForgetIndivisualPassword)
router.post("/indivisual-verify-otp", vendorForgetIndivisualVerifyOtp)
router.post("/company-verify-otp", vendorVerifyCompanyOtp)
router.post("/company-reset-password", vendorResetCompanyPassword)
router.post("/indivisual-reset-password", vendorForgetIndivisualResetPassword)


router.put(
  "/update-company-vendor",
  multer.memoryUpload.fields([
    { name: "owner_photo", maxCount: 1 },
    { name: "office_photo", maxCount: 1 },
    { name: "visiting_card", maxCount: 1 },
    { name: "business_license", maxCount: 1 },
    { name: "aadhar_pan", maxCount: 1 },
    { name: "gst_certificate", maxCount: 1 },
    { name: "electricity_bill", maxCount: 1 },
  ]),
 updateCompanyVendor
);
router.put(
  "/update-indivisual-vendor",
  multer.memoryUpload.fields([
  { name: "owner_photo", maxCount: 1 },
    { name: "office_photo", maxCount: 1 },
    { name: "visiting_card", maxCount: 1 },
    { name: "business_license", maxCount: 1 },
    { name: "aadhar_pan", maxCount: 1 },
    { name: "gst_certificate", maxCount: 1 },
    { name: "electricity_bill", maxCount: 1 }
  ]),
 updateIndividualVendor
);


router.get("/profile", verifyVendor,getProfile)
router.get("/with-pagination", getAllVendorsWithPagination)
router.get("/active",getActiveVendorsWithPagination)
router.get("/inactive", getInactiveVendorsWithPagination)

router.post("/approved",vendorApproved)
router.post("/rejected",vendorRejected)
router.get("/company", getCompanyVendorsWithPagination)
router.get("/indivisual", getIndividualVendorsWithPagination)
router.get("/", getAllVendors)
router.get("/:id", getOneVendor)
router.delete("/:id", deleteVendor)
router.put("/status/:id", updateVendorStatus)



module.exports = router;
