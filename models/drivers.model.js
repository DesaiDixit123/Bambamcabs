let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate-v2');
let schema = new mongoose.Schema({
    vendor_id: {

        type: mongoose.Types.ObjectId,
        default: null
    },
    admin_id: {
        
        type: mongoose.Types.ObjectId,
        default: null
    },
    driver_photo: {
        type: String,
        require: true
    },
    driver_name: {
        type: String,
        require: true
    },
    driver_mobile: {
        type: String,
        require: true
    },
    dob: {
        type: String,
        require: true
    },
    DL_number: {
        type: String,
        require: true
    },
    DL_issue_date: {
        type: String,
        require: true
    },
    DL_expiry_date: {
        type: String,
        require: true
    },
    language_known: [],
    vehicales_drive: [],
    status: {
        type: Boolean,
        default: false
    },
    approval_status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    DL_photo: {
        type: String,
        require: true
    },
    approve_reject_by: {
        type: mongoose.Types.ObjectId,
        default: null
    },
    createdBy: {
        type: mongoose.Types.ObjectId,
        require: true
    },
    updatedBy: {
        type: mongoose.Types.ObjectId,
        require: true
    },
    createAtTimestamp: {
        type: Number,
        require: true
    },
    updateAtTimestamp: {
        type: Number,
        require: true
    }
}, { timestamps: true, strict: false, autoIndex: true });
schema.plugin(mongoosePaginate);
module.exports = mongoose.model('drivers', schema);


