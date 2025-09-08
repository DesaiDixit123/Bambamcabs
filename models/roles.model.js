let mongoose = require("mongoose");
let mongoosePaginate = require("mongoose-paginate-v2");
let permission_Schema = new mongoose.Schema({
    displayname: {
        type: String,
        default: "",
    },
    collectionName: {
        type: String,
        default: "",
    },
    insert: {
        type: Boolean,
        default: true,
    },
    update: {
        type: Boolean,
        default: true,
    },
    delete: {
        type: Boolean,
        default: true,
    },
    view: {
        type: Boolean,
        default: true,
    },
}, { _id: false });
let schema = new mongoose.Schema({
    name: {
        type: String,
        require: true
    },
    status: {
        type: Boolean,
        default: true
    },
    permissions: [permission_Schema],
    createdAtTimestamp: {
        type: Number,
        require: true
    },
    updatedAtTimestamp: {
        type: Number,
        require: true
    },
    createdBy: {
        type: mongoose.Types.ObjectId,
        default: null
    },
    updatedBy: {
        type: mongoose.Types.ObjectId,
        default: null
    }
}, { timestamps: true, strict: false, autoIndex: true });
schema.plugin(mongoosePaginate);
module.exports = schema;