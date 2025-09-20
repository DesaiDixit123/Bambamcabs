const responseManager = require("../../../../utilities/response.manager");
const vendorModel = require("../../../../models/vendors.model");

exports.getAllVendors = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    let vendors = await vendorModel.find().lean();

    if (vendors && vendors.length > 0) {
      return responseManager.onSuccess("Vendors fetched successfully", vendors, res);
    } else {
      return responseManager.onSuccess("No vendors found", [], res);
    }
  } catch (err) {
    return responseManager.onError(err, res);
  }
};


exports.getAllVendorsWithPagination = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Extract query params for pagination and search
    let { page, limit, search } = req.query;

    page = parseInt(page) || 1;      // default page 1
    limit = parseInt(limit) || 10;   // default 10 items per page

    // Build search query
    let query = {};
    if (search) {
      const searchRegex = new RegExp(search, "i"); // case-insensitive search
      query = {
        $or: [
          { owner_name: { $regex: searchRegex } },
          { owner_mobile: { $regex: searchRegex } },
          { owner_email: { $regex: searchRegex } },
          { company_name: { $regex: searchRegex } },
          { company_email: { $regex: searchRegex } },
        ]
      };
    }

    // Pagination options
    const options = {
      page,
      limit,
      sort: { createdAt: -1 },
      lean: true
    };

    const result = await vendorModel.paginate(query, options);

    if (result && result.docs.length > 0) {
      return responseManager.onSuccess("Vendors fetched successfully", {
        totalDocs: result.totalDocs,
        totalPages: result.totalPages,
        page: result.page,
        limit: result.limit,
        vendors: result.docs
      }, res);
    } else {
      return responseManager.onSuccess("No vendors found", {
        totalDocs: 0,
        totalPages: 0,
        page,
        limit,
        vendors: []
      }, res);
    }
  } catch (err) {
    return responseManager.onError(err, res);
  }
};

// ✅ Company Vendors API with Search
exports.getCompanyVendorsWithPagination = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    let { page, limit, search } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    // Base filter
    let query = { register_type: "company" };

    // ✅ Search filter
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

    const options = { page, limit, sort: { createdAt: -1 }, lean: true };

    const result = await vendorModel.paginate(query, options);

    return responseManager.onSuccess("Company vendors fetched successfully", {
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


// ✅ Individual Vendors API with Search
exports.getIndividualVendorsWithPagination = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    let { page, limit, search } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    // Base filter
    let query = { register_type: "individual" };

    // ✅ Search filter
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { owner_name: { $regex: searchRegex } },
        { owner_mobile: { $regex: searchRegex } },
        { owner_email: { $regex: searchRegex } },
      ];
    }

    const options = { page, limit, sort: { createdAt: -1 }, lean: true };

    const result = await vendorModel.paginate(query, options);

    return responseManager.onSuccess("Individual vendors fetched successfully", {
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


exports.getOneVendor = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { id } = req.params; // vendor ID from URL params

    if (!id) {
      return responseManager.onError("Vendor ID is required", res);
    }

    const vendor = await vendorModel.findById(id).lean();

    if (vendor) {
      return responseManager.onSuccess("Vendor fetched successfully", vendor, res);
    } else {
      return responseManager.onSuccess("Vendor not found", {}, res);
    }

  } catch (err) {
    return responseManager.onError(err, res);
  }
};
