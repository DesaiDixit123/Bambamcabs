let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate-v2');

let schema = new mongoose.Schema({
    vendor_id: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "vendors"
    },
    admin_id: {
        type: mongoose.Types.ObjectId,
        ref: "admins",
        default: null
    },
    car_photo: {
        type: String,
        required: true
    },
    brand_name: {
        type: String,
        required: true
    },
    vehicle_type: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "vehicletypes"
    },
    vehicle_number: {
        type: String,
        required: true,
        unique: true
    },
    fuel_type: [
        {
            type: mongoose.Types.ObjectId,
            ref: "fueltypes",
            required: true
        }
    ],

    vehicle_make_year: {
        type: String,
        required: true
    },


    // Preferences
    sourcing: {
        type: String,
        required: true
    },
    pet_friendly: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No'
    },
    luggage_carrier: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No'
    },
    working_rear_seat_belts: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No'
    },

    // Documents
    insurance_expiry: {
        type: String,
        required: true
    },
    fitness_expiry: {
        type: String,
        required: true
    },
    permit_expiry: {
        type: String,
        required: true
    },
    permit_type: {
        type: String,
        required: true
    },
    insurance_document: {
        type: String,
        required: true
    },
    fitness_document: {
        type: String,
        required: true
    },
    permit_document: {
        type: String,
        required: true
    },
    puc_document: {
        type: String,
        required: true
    },
    rc_image: {
        type: String,
        required: true
    },

    include_facilities: [
        {
            logo: { type: String },
            description: { type: String, default: "" }
        }
    ],
    exclude_facilities: [
        {
            logo: { type: String },
            description: { type: String, default: "" }
        }
    ],
    vehicles_features: [
        {
            logo: { type: String },
            description: { type: String, default: "" }
        }
    ],
    terms_conditions: {
        type: String,
        required: false, // optional rakhiye
        default: ""
    },
    status: {
        type: Boolean,
        default: false
    },
    approval_status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    approve_reject_by: { type: mongoose.Types.ObjectId },

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

schema.plugin(mongoosePaginate);
module.exports = mongoose.model('vehicles', schema);