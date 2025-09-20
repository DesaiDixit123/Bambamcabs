let mongoose = require("mongoose");
let mongoosePaginate = require('mongoose-paginate-v2');

let blogSchema = new mongoose.Schema({
    adminId: {   // 👈 Blog kon admin create kare che ena mate
        type: mongoose.Types.ObjectId,
        ref: "admins",
        required: true
    },
    blogTitle: {
        type: String,
        required: true,
        trim: true
    },
    blogBrief: {
        type: String,
        required: true,
        trim: true
    },
    blogContent: {
        type: String,
        required: true
    },
    media: {   // 👈 Image/Video store karva mate
        type: String,   // URL (Cloudinary / S3 link)
        required: true
    },
    status: {
        type: Boolean,
        default: true
    },
    createdBy: { type: mongoose.Types.ObjectId, ref: "admins" },
    updatedBy: { type: mongoose.Types.ObjectId, ref: "admins" },
    createdAtTimestamp: { type: Number, default: Date.now },
    updatedAtTimestamp: { type: Number, default: Date.now }
});

blogSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("blogs", blogSchema);
