const responseManager = require("../../../../../utilities/response.manager");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const AwsCloud = require("../../../../../utilities/aws");
const vendorModel = require("../../../../../models/vendors.model");
const allowedContentTypes = require("../../../../../utilities/content-types");

exports.registerCompanyVendor = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    let {
      owner_name,
      owner_mobile,
      owner_city,
      owner_state,
      company_name,
      company_email,
      address,
      fleet_size,
      username,
      password,
      confirm_password,
      country_code
    } = req.body;

    // ===== Validations =====
    if (!owner_name || owner_name.trim().length < 3) {
      return responseManager.badrequest({ message: "Invalid owner name" }, res);
    }
    if (!owner_mobile || !/^[0-9]{10}$/.test(owner_mobile)) {
      return responseManager.badrequest({ message: "Invalid mobile number" }, res);
    }
    if (!company_email || !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(company_email)) {
      return responseManager.badrequest({ message: "Invalid company email" }, res);
    }
    if (!owner_city || owner_city.trim() === "") return responseManager.badrequest({ message: "Invalid city" }, res);
    if (!owner_state || owner_state.trim() === "") return responseManager.badrequest({ message: "Invalid state" }, res);
    if (!company_name || company_name.trim().length < 2) return responseManager.badrequest({ message: "Invalid company name" }, res);
    if (!address || address.trim() === "") return responseManager.badrequest({ message: "Address is required" }, res);
    if (!fleet_size || fleet_size.trim() === "") return responseManager.badrequest({ message: "Fleet size is required" }, res);
    if (!username || username.trim().length < 4) return responseManager.badrequest({ message: "Invalid username" }, res);
    if (!password || password.length < 6) return responseManager.badrequest({ message: "Invalid password, must be at least 6 characters" }, res);

    if (!confirm_password || confirm_password.trim() === "") {
      return responseManager.badrequest({ message: "Confirm password is required" }, res);
    }
    if (password !== confirm_password) {
      return responseManager.badrequest({ message: "Password and Confirm Password do not match" }, res);
    }

    // ===== Duplicate Check =====
    let checkMobile = await vendorModel.findOne({ owner_mobile }).lean();
    if (checkMobile) return responseManager.badrequest({ message: "Mobile already exists" }, res);

    let checkEmail = await vendorModel.findOne({ company_email }).lean();
    if (checkEmail) return responseManager.badrequest({ message: "Company email already exists" }, res);

    let checkUsername = await vendorModel.findOne({ username }).lean();
    if (checkUsername) return responseManager.badrequest({ message: "Username already exists" }, res);

    // ===== Upload Files to AWS =====
    const imageFields = ["owner_photo", "office_photo", "visiting_card"];
    const documentFields = ["business_license", "aadhar_pan", "gst_certificate", "electricity_bill"];

    let uploadedFiles = {};

    // ✅ Image Upload
    for (let field of imageFields) {
      let file = req.files && req.files[field] ? req.files[field][0] : null;
      if (!file) return responseManager.badrequest({ message: `${field} is required` }, res);

      if (!file.mimetype || !["image/jpeg", "image/png", "image/jpg"].includes(file.mimetype)) {
        return responseManager.badrequest({ message: `${field} must be a valid image` }, res);
      }

      let filesizeinMb = parseFloat(file.size / 1048576);
      if (filesizeinMb > 5) return responseManager.badrequest({ message: `${field} must be <= 5 MB` }, res);

      let uploadResult = await AwsCloud.saveToS3(file.buffer, "vendor", file.mimetype, field);
      uploadedFiles[field] = uploadResult.data.Key;
    }

    // ✅ Document Upload (PDF only)
    for (let field of documentFields) {
      let file = req.files && req.files[field] ? req.files[field][0] : null;
      if (!file) return responseManager.badrequest({ message: `${field} is required` }, res);

      if (!file.mimetype || file.mimetype !== "application/pdf") {
        return responseManager.badrequest({ message: `${field} must be a PDF file` }, res);
      }

      let filesizeinMb = parseFloat(file.size / 1048576);
      if (filesizeinMb > 5) return responseManager.badrequest({ message: `${field} must be <= 5 MB` }, res);

      let uploadResult = await AwsCloud.saveToS3(file.buffer, "vendor", file.mimetype, field);
      uploadedFiles[field] = uploadResult.data.Key;
    }

    // ===== Password Hashing =====
    const hashedPassword = await bcrypt.hash(password, 10);

    // ===== Country Code =====
    let finalCountryCode = "";
    if (country_code && country_code.trim() !== "") {
      if (country_code.startsWith("+")) {
        finalCountryCode = country_code.trim();
      } else {
        finalCountryCode = "+" + country_code.trim();
      }
    } else {
      finalCountryCode = "+91"; // default
    }

    // ===== Save Vendor =====
    let vendorObj = {
      register_type: "company",   // 👈 Auto set
      owner_photo: uploadedFiles.owner_photo,
      office_photo: uploadedFiles.office_photo,
      visiting_card: uploadedFiles.visiting_card,
      business_license: uploadedFiles.business_license,
      aadhar_pan: uploadedFiles.aadhar_pan,
      gst_certificate: uploadedFiles.gst_certificate,
      electricity_bill: uploadedFiles.electricity_bill,
      owner_name: owner_name.trim(),
      owner_mobile,
      country_code: finalCountryCode,
      company_email: company_email.trim().toLowerCase(),
      owner_city: owner_city.trim(),
      owner_state: owner_state.trim(),
      company_name: company_name.trim(),
      address: address.trim(),
      fleet_size: fleet_size.trim(),
      username: username.trim(),
      password: hashedPassword,
      status: true,
      approval_status: "pending",
      createdBy: new mongoose.Types.ObjectId(),
      updatedBy: new mongoose.Types.ObjectId(),
      createAtTimestamp: Date.now(),
      updateAtTimestamp: Date.now(),
    };

    let newVendor = await vendorModel.create(vendorObj);

    return responseManager.onSuccess("Vendor registered successfully", newVendor, res);
  } catch (err) {
    return responseManager.onError(err, res);
  }
};











// const responseManager = require("../../../../../utilities/response.manager");
// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");
// const AwsCloud = require("../../../../../utilities/aws");
// const vendorModel = require("../../../../../models/vendors.model");
// const allowedContentTypes = require("../../../../../utilities/content-types");
// const mongoConnection = require("../../../../../utilities/connections");
// const constants = require("../../../../../utilities/constants");
// const config = require("../../../../../utilities/config");
// const adminsModel = require("../../../../../models/admins.model");

// exports.registerCompanyVendor = async (req, res) => {
//   try {
//     res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
//     res.setHeader("Access-Control-Allow-Origin", "*");

//     // ================= Token Check (same as saveadminuser) =================
//     if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
//       let primary = mongoConnection.useDb(constants.DEFAULT_DB);
//       let adminData = await primary
//         .model(constants.MODELS.admins, adminsModel)
//         .findById(req.token.adminId)
//         .lean();
      
//     console.log("req.token.adminId :", req.token.adminId);
// console.log("adminData :", adminData);


//       if (adminData && adminData != null && adminData.status === true) {
//         let havepermission = await config.getPermission(adminData.roleid, "vendors", "insert");
//         if (!havepermission) {
//           return responseManager.accessDenied(res);
//         }

//         // ================= Body Params =================
//         let {
//           owner_name,
//           owner_mobile,
//           owner_city,
//           owner_state,
//           company_name,
//           company_email,
//           address,
//           fleet_size,
//           username,
//           password,
//           confirm_password,
//           country_code,
//         } = req.body;

//         // ================= Validations =================
//         if (!owner_name || owner_name.trim().length < 3) {
//           return responseManager.badrequest({ message: "Invalid owner name" }, res);
//         }
//         if (!owner_mobile || !/^[0-9]{10}$/.test(owner_mobile)) {
//           return responseManager.badrequest({ message: "Invalid mobile number" }, res);
//         }
//         if (
//           !company_email ||
//           !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(company_email)
//         ) {
//           return responseManager.badrequest({ message: "Invalid company email" }, res);
//         }
//         if (!owner_city || owner_city.trim() === "")
//           return responseManager.badrequest({ message: "Invalid city" }, res);
//         if (!owner_state || owner_state.trim() === "")
//           return responseManager.badrequest({ message: "Invalid state" }, res);
//         if (!company_name || company_name.trim().length < 2)
//           return responseManager.badrequest({ message: "Invalid company name" }, res);
//         if (!address || address.trim() === "")
//           return responseManager.badrequest({ message: "Address is required" }, res);
//         if (!fleet_size || fleet_size.trim() === "")
//           return responseManager.badrequest({ message: "Fleet size is required" }, res);
//         if (!username || username.trim().length < 4)
//           return responseManager.badrequest({ message: "Invalid username" }, res);
//         if (!password || password.length < 6)
//           return responseManager.badrequest(
//             { message: "Invalid password, must be at least 6 characters" },
//             res
//           );

//         if (!confirm_password || confirm_password.trim() === "") {
//           return responseManager.badrequest({ message: "Confirm password is required" }, res);
//         }
//         if (password !== confirm_password) {
//           return responseManager.badrequest(
//             { message: "Password and Confirm Password do not match" },
//             res
//           );
//         }

//         // ================= Duplicate Check =================
//         let checkMobile = await vendorModel.findOne({ owner_mobile }).lean();
//         if (checkMobile)
//           return responseManager.badrequest({ message: "Mobile already exists" }, res);

//         let checkEmail = await vendorModel.findOne({ company_email }).lean();
//         if (checkEmail)
//           return responseManager.badrequest({ message: "Company email already exists" }, res);

//         let checkUsername = await vendorModel.findOne({ username }).lean();
//         if (checkUsername)
//           return responseManager.badrequest({ message: "Username already exists" }, res);

//         // ================= Upload Files =================
//         const imageFields = ["owner_photo", "office_photo", "visiting_card"];
//         const documentFields = ["business_license", "aadhar_pan", "gst_certificate", "electricity_bill"];

//         let uploadedFiles = {};

//         // ✅ Image Upload
//         for (let field of imageFields) {
//           let file = req.files && req.files[field] ? req.files[field][0] : null;
//           if (!file) return responseManager.badrequest({ message: `${field} is required` }, res);

//           if (!file.mimetype || !["image/jpeg", "image/png", "image/jpg"].includes(file.mimetype)) {
//             return responseManager.badrequest({ message: `${field} must be a valid image` }, res);
//           }

//           let filesizeinMb = parseFloat(file.size / 1048576);
//           if (filesizeinMb > 5)
//             return responseManager.badrequest({ message: `${field} must be <= 5 MB` }, res);

//           let uploadResult = await AwsCloud.saveToS3(file.buffer, "vendor", file.mimetype, field);
//           uploadedFiles[field] = uploadResult.data.Key;
//         }

//         // ✅ Document Upload (PDF only)
//         for (let field of documentFields) {
//           let file = req.files && req.files[field] ? req.files[field][0] : null;
//           if (!file) return responseManager.badrequest({ message: `${field} is required` }, res);

//           if (!file.mimetype || file.mimetype !== "application/pdf") {
//             return responseManager.badrequest({ message: `${field} must be a PDF file` }, res);
//           }

//           let filesizeinMb = parseFloat(file.size / 1048576);
//           if (filesizeinMb > 5)
//             return responseManager.badrequest({ message: `${field} must be <= 5 MB` }, res);

//           let uploadResult = await AwsCloud.saveToS3(file.buffer, "vendor", file.mimetype, field);
//           uploadedFiles[field] = uploadResult.data.Key;
//         }

//         // ================= Password Hashing =================
//         const hashedPassword = await bcrypt.hash(password, 10);

//         // ================= Country Code =================
//         let finalCountryCode = "";
//         if (country_code && country_code.trim() !== "") {
//           if (country_code.startsWith("+")) {
//             finalCountryCode = country_code.trim();
//           } else {
//             finalCountryCode = "+" + country_code.trim();
//           }
//         } else {
//           finalCountryCode = "+91"; // default
//         }

//         // ================= Save Vendor =================
//         let vendorObj = {
//           register_type: "company",
//           owner_photo: uploadedFiles.owner_photo,
//           office_photo: uploadedFiles.office_photo,
//           visiting_card: uploadedFiles.visiting_card,
//           business_license: uploadedFiles.business_license,
//           aadhar_pan: uploadedFiles.aadhar_pan,
//           gst_certificate: uploadedFiles.gst_certificate,
//           electricity_bill: uploadedFiles.electricity_bill,
//           owner_name: owner_name.trim(),
//           owner_mobile,
//           country_code: finalCountryCode,
//           company_email: company_email.trim().toLowerCase(),
//           owner_city: owner_city.trim(),
//           owner_state: owner_state.trim(),
//           company_name: company_name.trim(),
//           address: address.trim(),
//           fleet_size: fleet_size.trim(),
//           username: username.trim(),
//           password: hashedPassword,
//           status: false,
//           approval_status: "pending",
//           createdBy: new mongoose.Types.ObjectId(req.token.adminId),
//           updatedBy: new mongoose.Types.ObjectId(req.token.adminId),
//           createAtTimestamp: Date.now(),
//           updateAtTimestamp: Date.now(),
//         };

//         let newVendor = await vendorModel.create(vendorObj);

//         return responseManager.onSuccess("Vendor registered successfully", newVendor, res);
//       } else {
//         return responseManager.unauthorisedRequest(res);
//       }
//     } else {
//       return responseManager.unauthorisedRequest(res);
//     }
//   } catch (err) {
//     return responseManager.onError(err, res);
//   }
// };
