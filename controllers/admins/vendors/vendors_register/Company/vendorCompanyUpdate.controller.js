const responseManager = require("../../../../../utilities/response.manager");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const AwsCloud = require("../../../../../utilities/aws");
const vendorModel = require("../../../../../models/vendors.model");

exports.updateCompanyVendor = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { vendor_id } = req.body;

    if (!vendor_id || !mongoose.Types.ObjectId.isValid(vendor_id)) {
      return responseManager.badrequest({ message: "Invalid vendor ID" }, res);
    }

    // ===== Fetch existing vendor =====
    let vendorData = await vendorModel.findById(vendor_id);
    if (!vendorData) {
      return responseManager.badrequest({ message: "Vendor not found" }, res);
    }

    // ===== Fields that can be updated =====
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
      country_code
    } = req.body;

    // ===== Validations =====
    if (owner_name && owner_name.trim().length < 3) {
      return responseManager.badrequest({ message: "Invalid owner name" }, res);
    }
    if (owner_mobile && !/^[0-9]{10}$/.test(owner_mobile)) {
      return responseManager.badrequest({ message: "Invalid mobile number" }, res);
    }
    if (company_email && !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(company_email)) {
      return responseManager.badrequest({ message: "Invalid company email" }, res);
    }

    // ===== Duplicate Checks (Only if value changed) =====
    if (owner_mobile && owner_mobile !== vendorData.owner_mobile) {
      let checkMobile = await vendorModel.findOne({ owner_mobile }).lean();
      if (checkMobile) return responseManager.badrequest({ message: "Mobile already exists" }, res);
    }

    if (company_email && company_email.toLowerCase() !== vendorData.company_email.toLowerCase()) {
      let checkEmail = await vendorModel.findOne({ company_email: company_email.toLowerCase() }).lean();
      if (checkEmail) return responseManager.badrequest({ message: "Company email already exists" }, res);
    }

    if (username && username !== vendorData.username) {
      let checkUsername = await vendorModel.findOne({ username }).lean();
      if (checkUsername) return responseManager.badrequest({ message: "Username already exists" }, res);
    }

    // ===== File Uploads (optional) =====
    const imageFields = ["owner_photo", "office_photo", "visiting_card"];
    const documentFields = ["business_license", "aadhar_pan", "gst_certificate", "electricity_bill"];
    let uploadedFiles = {};

    for (let field of imageFields) {
      let file = req.files && req.files[field] ? req.files[field][0] : null;
      if (file) {
        if (!["image/jpeg", "image/png", "image/jpg"].includes(file.mimetype)) {
          return responseManager.badrequest({ message: `${field} must be a valid image` }, res);
        }
        let filesizeinMb = parseFloat(file.size / 1048576);
        if (filesizeinMb > 5) return responseManager.badrequest({ message: `${field} must be <= 5 MB` }, res);

        let uploadResult = await AwsCloud.saveToS3(file.buffer, "vendor", file.mimetype, field);
        uploadedFiles[field] = uploadResult.data.Key;
      }
    }

    for (let field of documentFields) {
      let file = req.files && req.files[field] ? req.files[field][0] : null;
      if (file) {
        if (file.mimetype !== "application/pdf") {
          return responseManager.badrequest({ message: `${field} must be a PDF file` }, res);
        }
        let filesizeinMb = parseFloat(file.size / 1048576);
        if (filesizeinMb > 5) return responseManager.badrequest({ message: `${field} must be <= 5 MB` }, res);

        let uploadResult = await AwsCloud.saveToS3(file.buffer, "vendor", file.mimetype, field);
        uploadedFiles[field] = uploadResult.data.Key;
      }
    }

    // ===== Password Hashing =====
    let hashedPassword;
    if (password) {
      if (password.length < 6) return responseManager.badrequest({ message: "Password too short" }, res);
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // ===== Prepare update object =====
    let updateObj = {
      updatedBy: new mongoose.Types.ObjectId(),
      updateAtTimestamp: Date.now()
    };

    if (owner_name) updateObj.owner_name = owner_name.trim();
    if (owner_mobile) updateObj.owner_mobile = owner_mobile;
    if (owner_city) updateObj.owner_city = owner_city.trim();
    if (owner_state) updateObj.owner_state = owner_state.trim();
    if (company_name) updateObj.company_name = company_name.trim();
    if (company_email) updateObj.company_email = company_email.trim().toLowerCase();
    if (address) updateObj.address = address.trim();
    if (fleet_size) updateObj.fleet_size = fleet_size.trim();
    if (username) updateObj.username = username.trim();
    if (hashedPassword) updateObj.password = hashedPassword;
    if (country_code) updateObj.country_code = country_code.startsWith("+") ? country_code.trim() : "+" + country_code.trim();

    // Merge uploaded files
    Object.assign(updateObj, uploadedFiles);

    // ===== Update Vendor =====
    let updatedVendor = await vendorModel.findByIdAndUpdate(vendor_id, updateObj, { new: true });

    return responseManager.onSuccess("Vendor updated successfully", updatedVendor, res);

  } catch (err) {
    console.error(err);
    return responseManager.onError(err, res);
  }
};
