let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate-v2');

let schema = new mongoose.Schema({
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admins',
        default: null
    },
    offer_name: {
        type: String,
        required: true,
        trim: true
    },
    offer_code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    discount_value: {
        type: Number,
        required: true
    },
    discount_type: {
        type: String,
        enum: ['%', '₹'],
        required: true
    },
    start_datetime: {
        type: Date,
        required: true
    },
    end_datetime: {
        type: Date,
        required: true
    },
    applicable_users: {
        type: String,
        enum: ['All Users', 'New Users Only', 'Vendors'],
        required: true
    },
    description: {
        type: String,
        default: ""
    },
    vehicle_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'vehicletypes',   // Vehicle collection reference
        required: true
    }],
    city_location_restriction: [{
        type: String,   // manual city names instead of ObjectId
        trim: true
    }],
    status: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admins',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admins',
        required: true
    },
    createdAtTimestamp: {
        type: Number,
        default: () => Date.now()
    },
    updatedAtTimestamp: {
        type: Number,
        default: () => Date.now()
    }
}, { timestamps: true, strict: false, autoIndex: true });

schema.plugin(mongoosePaginate);

module.exports = mongoose.model('Offer', schema);
