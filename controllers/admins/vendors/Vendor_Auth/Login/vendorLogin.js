const responseManager = require("../../../../../utilities/response.manager");
const helper = require("../../../../../utilities/helper");
const vendorModel = require("../../../../../models/vendors.model");
const bcrypt = require("bcryptjs");
const mongoConnection = require("../../../../../utilities/connections");
const constants = require("../../../../../utilities/constants");
const nodemailer = require("nodemailer");



exports.vendorLogin = async (req, res) => {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { username, password } = req.body;

    if (!username || username.trim() === "") {
        return responseManager.badrequest(
            { message: "Username is required, Please provide valid username and try again...!" },
            res
        );
    }
    if (!password || password.trim() === "") {
        return responseManager.badrequest(
            { message: "Password is required, Please provide valid password and try again...!" },
            res
        );
    }

    //  username check
    let vendorData = await vendorModel.findOne({ username: username.trim() }).lean();
    console.log("Vendor data:", vendorData);

    if (!vendorData) {
        return responseManager.badrequest(
            { message: "Invalid username, Please provide valid username and try again...!" },
            res
        );
    }

    //  approval_status check
    if (vendorData.approval_status !== "approved") {
        return responseManager.badrequest(
            { message: "Your account is not approved yet. Please contact admin...!" },
            res
        );
    }

    //  password bcrypt compare
    const isMatch = await bcrypt.compare(password, vendorData.password);
    if (!isMatch) {
        return responseManager.badrequest(
            { message: "Invalid password, Please provide valid password and try again...!" },
            res
        );
    }

    //  token generate
    let accesstoken = await helper.generateAccessToken({
        vendorId: vendorData._id.toString(),
    });

    //  token save in vendor document
    await vendorModel.findByIdAndUpdate(vendorData._id, {
        $set: { jwt_token: accesstoken, updateAtTimestamp: Date.now() },
    });

    //  latest vendor details fetch with new token
    let updatedVendor = await vendorModel.findById(vendorData._id).lean();

    return responseManager.onSuccess(
        "Vendor login successfully...",
        { accesstoken: accesstoken, vendordetails: updatedVendor },
        res
    );
};




exports.getProfile = async (req, res) => {
  try {
    // vendor details middleware ma attach karine aavse
    const vendor = req.vendor;

    if (!vendor) {
      return responseManager.badrequest(
        { message: "Vendor details not found, please login again...!" },
        res
      );
    }

    return responseManager.onSuccess(
      "Vendor profile fetched successfully",
      vendor,
      res
    );
  } catch (err) {
    return responseManager.onError(err, res);
  }
};