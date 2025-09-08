const responseManager = require("../../../../utilities/response.manager");
const vendorModel = require("../../../../models/vendors.model");

exports.deleteVendor = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { id } = req.params; // vendor ID from URL

    if (!id) {
      return responseManager.onError("Vendor ID is required", res);
    }

    const deletedVendor = await vendorModel.findByIdAndDelete(id);

    if (deletedVendor) {
      return responseManager.onSuccess("Vendor deleted successfully", deletedVendor, res);
    } else {
      return responseManager.onSuccess("Vendor not found", {}, res);
    }

  } catch (err) {
    return responseManager.onError(err, res);
  }
};
