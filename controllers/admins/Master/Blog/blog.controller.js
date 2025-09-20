const mongoose = require("mongoose");
const mongoConnection = require("../../../../utilities/connections");
const responseManager = require("../../../../utilities/response.manager");
const constants = require("../../../../utilities/constants");
const adminsModel = require("../../../../models/admins.model");
const blogModel = require("../../../../models/Admin/Master/blog.model");
const XLSX = require("xlsx");
const AwsCloud = require("../../../../utilities/aws");
/** =================== Add Blog =================== **/
exports.addBlog = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                let { blogTitle, blogBrief, blogContent } = req.body;

                // ===== Validations =====
                if (!blogTitle || blogTitle.trim().length < 3) {
                    return responseManager.badrequest({ message: "Invalid blog title" }, res);
                }
                if (!blogBrief || blogBrief.trim().length < 10) {
                    return responseManager.badrequest({ message: "Blog brief must be at least 10 chars" }, res);
                }
                if (!blogContent || blogContent.trim().length < 20) {
                    return responseManager.badrequest({ message: "Blog content must be at least 20 chars" }, res);
                }

                // ===== Upload Media (Image / Video) =====
                let mediaFile = req.files && req.files.media ? req.files.media[0] : null;
                if (!mediaFile) {
                    return responseManager.badrequest({ message: "Blog media is required" }, res);
                }

                let allowedImageTypes = ["image/jpeg", "image/png", "image/jpg"];
                let allowedVideoTypes = ["video/mp4", "video/mkv"];

                let uploadResult = null;

                if (allowedImageTypes.includes(mediaFile.mimetype)) {
                    let filesizeinMb = parseFloat(mediaFile.size / 1048576);
                    if (filesizeinMb > 5) {
                        return responseManager.badrequest({ message: "Image must be <= 5 MB" }, res);
                    }
                    uploadResult = await AwsCloud.saveToS3(
                        mediaFile.buffer,
                        "blogs",
                        mediaFile.mimetype,
                        "blog_media"
                    );
                } else if (allowedVideoTypes.includes(mediaFile.mimetype)) {
                    let filesizeinMb = parseFloat(mediaFile.size / 1048576);
                    if (filesizeinMb > 50) {
                        return responseManager.badrequest({ message: "Video must be <= 50 MB" }, res);
                    }
                    uploadResult = await AwsCloud.saveToS3(
                        mediaFile.buffer,
                        "blogs",
                        mediaFile.mimetype,
                        "blog_media"
                    );
                } else {
                    return responseManager.badrequest({ message: "Only JPG, PNG, MP4, MKV allowed" }, res);
                }

                const createdBy = req.token.adminId;

                // ===== Save Blog =====
                let blogObj = {
                    adminId: createdBy,
                    createdBy,
                    updatedBy: createdBy,
                    blogTitle: blogTitle.trim(),
                    blogBrief: blogBrief.trim(),
                    blogContent: blogContent.trim(),
                    media: uploadResult.data.Key,
                    status: true,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };

                let newBlog = await blogModel.create(blogObj);
                return responseManager.onSuccess("Blog added successfully", newBlog, res);
            } else {
                return responseManager.unauthorisedRequest(res);
            }
        } else {
            return responseManager.unauthorisedRequest(res);
        }
    } catch (err) {
        return responseManager.onError(err, res);
    }
};


/** =================== List Blogs =================== **/
exports.listBlogs = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                let { page = 1, limit = 10, search = "", status, date } = req.query;
                let query = {};
                if (search && search.trim() !== "") query.blogTitle = { $regex: new RegExp(search.trim(), "i") };
                if (status !== undefined) query.status = status === "true";
                if (date) {
                    let start = new Date(date); start.setHours(0, 0, 0, 0);
                    let end = new Date(date); end.setHours(23, 59, 59, 999);
                    query.createdAt = { $gte: start, $lte: end };
                }

                const options = { page: parseInt(page), limit: parseInt(limit), sort: { createdAt: -1 }, lean: true };
                const result = await blogModel.paginate(query, options);
                return responseManager.onSuccess("Blogs fetched successfully", result, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);

    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Get By ID =================== **/
exports.getBlogById = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);
                const blog = await blogModel.findById(id).lean();
                if (!blog) return responseManager.badrequest({ message: "Blog not found" }, res);
                return responseManager.onSuccess("Blog fetched successfully", blog, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);

    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Update Blog =================== **/
exports.updateBlog = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                // 👇 blogId from params
                let blogId = req.params.blogId;  
                let { blogTitle, blogBrief, blogContent } = req.body;

                if (!blogId || !mongoose.Types.ObjectId.isValid(blogId)) {
                    return responseManager.badrequest({ message: "Invalid blog id" }, res);
                }

                let updateObj = {
                    updatedAt: Date.now(),
                    updatedBy: req.token.adminId,   // 👈 automatic from token
                };

                if (blogTitle) updateObj.blogTitle = blogTitle.trim();
                if (blogBrief) updateObj.blogBrief = blogBrief.trim();
                if (blogContent) updateObj.blogContent = blogContent.trim();

                // ===== Check & Upload New Media if provided =====
                let mediaFile = req.files && req.files.media ? req.files.media[0] : null;
                if (mediaFile) {
                    let allowedImageTypes = ["image/jpeg", "image/png", "image/jpg"];
                    let allowedVideoTypes = ["video/mp4", "video/mkv"];
                    let uploadResult = null;

                    if (allowedImageTypes.includes(mediaFile.mimetype)) {
                        let filesizeinMb = parseFloat(mediaFile.size / 1048576);
                        if (filesizeinMb > 5) {
                            return responseManager.badrequest({ message: "Image must be <= 5 MB" }, res);
                        }
                        uploadResult = await AwsCloud.saveToS3(mediaFile.buffer, "blogs", mediaFile.mimetype, "blog_media");
                    } else if (allowedVideoTypes.includes(mediaFile.mimetype)) {
                        let filesizeinMb = parseFloat(mediaFile.size / 1048576);
                        if (filesizeinMb > 50) {
                            return responseManager.badrequest({ message: "Video must be <= 50 MB" }, res);
                        }
                        uploadResult = await AwsCloud.saveToS3(mediaFile.buffer, "blogs", mediaFile.mimetype, "blog_media");
                    } else {
                        return responseManager.badrequest({ message: "Only JPG, PNG, MP4, MKV allowed" }, res);
                    }

                    updateObj.media = uploadResult.data.Key;
                }

                let updatedBlog = await blogModel
                    .findByIdAndUpdate(blogId, updateObj, { new: true })
                    .lean();

                return responseManager.onSuccess("Blog updated successfully", updatedBlog, res);
            } else {
                return responseManager.unauthorisedRequest(res);
            }
        } else {
            return responseManager.unauthorisedRequest(res);
        }
    } catch (err) {
        return responseManager.onError(err, res);
    }
};


/** =================== Delete Blog =================== **/
exports.deleteBlog = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);
                await blogModel.findByIdAndDelete(id);
                return responseManager.onSuccess("Blog deleted successfully", {}, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Toggle Status =================== **/
exports.toggleBlogStatus = async (req, res) => {
    try {
        if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary
                .model(constants.MODELS.admins, adminsModel)
                .findById(new mongoose.Types.ObjectId(req.token.adminId))
                .lean();

            if (adminData && adminData.status === true) {
                const { id } = req.params;
                if (!mongoose.Types.ObjectId.isValid(id)) return responseManager.badrequest({ message: "Invalid ID" }, res);
                const blog = await blogModel.findById(id).lean();
                if (!blog) return responseManager.badrequest({ message: "Blog not found" }, res);

                const updated = await blogModel.findByIdAndUpdate(
                    id,
                    { status: !blog.status, updatedAtTimestamp: Date.now() },
                    { new: true }
                ).lean();
                return responseManager.onSuccess("Blog status updated successfully", updated, res);
            } else return responseManager.unauthorisedRequest(res);
        } else return responseManager.unauthorisedRequest(res);
    } catch (err) { return responseManager.onError(err, res); }
};

/** =================== Export Blogs =================== **/
exports.exportBlogs = async (req, res) => {
    try {
        let { search = "", status, date } = req.query;
        let query = {};
        if (search && search.trim() !== "") query.blogTitle = { $regex: new RegExp(search.trim(), "i") };
        if (status !== undefined) query.status = status === "true";
        if (date) {
            let start = new Date(date); start.setHours(0, 0, 0, 0);
            let end = new Date(date); end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        const blogs = await blogModel.find(query).lean();
        if (!blogs || blogs.length === 0) return responseManager.badrequest({ message: "No data found to export" }, res);

        const cleaned = blogs.map((b, i) => {
            const { _id, createdAt, updatedAt, adminId, createdBy, updatedBy, __v, ...rest } = b;
            return { "Sr No": i + 1, ...rest };
        });

        const ws = XLSX.utils.json_to_sheet(cleaned);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Blogs");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Disposition", "attachment; filename=blogs.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buffer);
    } catch (err) { 
        return responseManager.onError(err, res); 
    }
};


/** =================== Import Blogs =================== **/
exports.importBlogs = async (req, res) => {
    try {
        if (!req.file) return responseManager.badrequest({ message: "Please upload a file" }, res);

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!data || data.length === 0) return responseManager.badrequest({ message: "File is empty or invalid" }, res);

        const now = Date.now();
        const adminId = req?.token?.adminId || new mongoose.Types.ObjectId();

        const newBlogs = data.map(item => ({
            blogTitle: item.blogTitle || null,
            blogBrief: item.blogBrief || null,
            blogContent: item.blogContent || null,
            media: item.media || null,
            status: item.status !== undefined ? item.status : true,
            createdAtTimestamp: item.createdAtTimestamp || now,
            updatedAtTimestamp: item.updatedAtTimestamp || now,
            adminId: adminId,
            createdBy: adminId,
            updatedBy: adminId
            // baki fields will remain undefined / null in DB
        }));

        if (newBlogs.length === 0) return responseManager.badrequest({ message: "Nothing to import" }, res);

        const inserted = await blogModel.insertMany(newBlogs);
        const totalCount = await blogModel.countDocuments();

        return responseManager.onSuccess(
            `${inserted.length} blogs imported successfully. Total: ${totalCount}`,
            { inserted, totalCount },
            res
        );
    } catch (err) { 
        return responseManager.onError(err, res); 
    }
};
