const responseManager = require("../../../../../utilities/response.manager");
const jwt = require("jsonwebtoken");
const vendorModel = require("../../../../../models/vendors.model");

const verifyVendor = async (req, res, next) => {
  try {
    const bearerHeader = req.headers["authorization"];
    if (typeof bearerHeader !== "undefined") {
      const bearer = bearerHeader.split(" ");
      const token = bearer[1];

      jwt.verify(token, process.env.WEB_LOGIN_AUTH_SECRET, async (err, decoded) => {
        if (err) {
          return responseManager.unauthorisedRequest(res);
        } else {
          try {
            const vendor = await vendorModel.findById(decoded.vendorId).lean();
            if (!vendor) {
              return responseManager.unauthorisedRequest(res);
            }

            // 🔹 check token match DB stored token
            if (vendor.jwt_token !== token) {
              return responseManager.unauthorisedRequest(res);
            }

            if (vendor.approval_status !== "approved") {
              return responseManager.unauthorisedRequest(res);
            }

            // attach vendor in request
            req.vendor = vendor;
            next();
          } catch (dbErr) {
            return responseManager.onError(dbErr, res);
          }
        }
      });
    } else {
      return responseManager.unauthorisedRequest(res);
    }
  } catch (err) {
    return responseManager.onError(err, res);
  }
};

module.exports = verifyVendor;
