const responseManager = require("../../../../utilities/response.manager");
const vendorModel = require("../../../../models/vendors.model");


exports.getActiveVendorsWithPagination = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    let { page, limit, search } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    // Search filter
    let query = { status: true };  // ✅ Only active vendors
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { owner_name: { $regex: searchRegex } },
        { owner_mobile: { $regex: searchRegex } },
        { owner_email: { $regex: searchRegex } },
        { company_name: { $regex: searchRegex } },
        { company_email: { $regex: searchRegex } },
      ];
    }

    const options = {
      page,
      limit,
      sort: { createdAt: -1 },
      lean: true
    };

    const result = await vendorModel.paginate(query, options);

    return responseManager.onSuccess("Active vendors fetched successfully", {
      totalDocs: result.totalDocs,
      totalPages: result.totalPages,
      page: result.page,
      limit: result.limit,
      vendors: result.docs
    }, res);

  } catch (err) {
    return responseManager.onError(err, res);
  }
};


// ✅ Inactive Vendors API
exports.getInactiveVendorsWithPagination = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    let { page, limit, search } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    // Search filter
    let query = { status: false };  // ✅ Only inactive vendors
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { owner_name: { $regex: searchRegex } },
        { owner_mobile: { $regex: searchRegex } },
        { owner_email: { $regex: searchRegex } },
        { company_name: { $regex: searchRegex } },
        { company_email: { $regex: searchRegex } },
      ];
    }

    const options = {
      page,
      limit,
      sort: { createdAt: -1 },
      lean: true
    };

    const result = await vendorModel.paginate(query, options);

    return responseManager.onSuccess("Inactive vendors fetched successfully", {
      totalDocs: result.totalDocs,
      totalPages: result.totalPages,
      page: result.page,
      limit: result.limit,
      vendors: result.docs
    }, res);

  } catch (err) {
    return responseManager.onError(err, res);
  }
};
