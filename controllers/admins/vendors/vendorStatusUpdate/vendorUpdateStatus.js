const responseManager = require("../../../../utilities/response.manager");
const vendorModel = require("../../../../models/vendors.model");

exports.updateVendorStatus = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { id } = req.params;         // vendor ID
    const { status } = req.body;       // new approval_status

    if (!id) {
      return responseManager.onError("Vendor ID is required", res);
    }

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return responseManager.onError("Invalid status value", res);
    }

    const updatedVendor = await vendorModel.findByIdAndUpdate(
      id,
      { approval_status: status },
      { new: true, lean: true }
    );

    if (updatedVendor) {
      return responseManager.onSuccess("Vendor status updated successfully", updatedVendor, res);
    } else {
      return responseManager.onSuccess("Vendor not found", {}, res);
    }

  } catch (err) {
    return responseManager.onError(err, res);
  }
};
