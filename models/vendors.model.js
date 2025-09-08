let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate-v2');

let schema = new mongoose.Schema({
    owner_photo: {
        type: String,
        required: true
    },
    owner_name: {
        type: String,
        required: true
    },
    owner_mobile: {
        type: String,
        required: true,
        unique: true
    },


    owner_city: {
        type: String,
        required: true
    },
    owner_state: {
        type: String,
        required: true
    },
    company_name: {
        type: String,
        required: function () {
            return this.register_type === "company";  // only company mate required
        },
    },
    company_email: {
        type: String,
        unique: true,
        sparse: true,
        required: function () {
            return this.register_type === "company"; // only company mate required
        },
        match: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
    },
    owner_email: {
        type: String,
        unique: true,
        sparse: true,
        required: function () {
            return this.register_type === "individual"; // only individual mate required
        },
        match: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
    },
    country_code: {
        type: String,
        default: "+91"   // default રાખવું હોય તો +91, નહી તો "" રાખો
    },

    address: {        // <- new field add kariyu
        type: String,
        required: true
    },
    fleet_size: {
        type: Number,
        required: true
    },
    office_photo: {
        type: String,
        required: true
    },
    visiting_card: {
        type: String,
        default: ""
    },
    business_license: {
        type: String,
        required: true
    },
    aadhar_pan: {
        type: String,
        required: true
    },
    gst_certificate: {
        type: String,
        required: true
    },
    electricity_bill: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    register_type: {
        type: String,
        enum: ['company', 'individual'],
        required: true
    },

    password: {
        type: String,
        required: true
    },
    status: {
        type: Boolean,
        default: true
    },
    jwt_token: {
        type: String,
        default: ""
    },
    otp: { type: String, default: "" },
    otp_created_at: { type: Number, default: 0 },
    otp_expire_at: { type: Number, default: 0 },
    fcm_token: {
        type: String,
        default: ""
    },
    lastsentotp: { type: String },
    lastsentotptimestamp: { type: Date },
    approval_status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejected_reason: {
    type: String,
    default: ""
},

    createdBy: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    updatedBy: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    createAtTimestamp: {
        type: Number,
        required: true
    },
    updateAtTimestamp: {
        type: Number,
        required: true
    }
}, { timestamps: true, strict: false, autoIndex: true });


// Mobile + register_type unique
schema.index({ owner_mobile: 1, register_type: 1 }, { unique: true });

// Username + register_type unique
schema.index({ username: 1, register_type: 1 }, { unique: true });

// Company email unique only for company
schema.index(
    { company_email: 1, register_type: 1 },
    { unique: true, partialFilterExpression: { register_type: "company" } }
);

// Owner email unique only for individual
schema.index(
    { owner_email: 1, register_type: 1 },
    { unique: true, partialFilterExpression: { register_type: "individual" } }
);


schema.plugin(mongoosePaginate);
module.exports = mongoose.model('Vendor', schema);

