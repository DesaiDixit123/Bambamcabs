let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate-v2');

let schema = new mongoose.Schema({
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    tax_name: {
        type: String,
        required: true
    },
    tax_type: {   // % or ₹
        type: String,
        enum: ['%', '₹'],
        required: true
    },
    tax_rate: {
        type: Number,
        required: true
    },
    applicable_on: {  // Oneway, Round Trip, Local Rental Trip
        type: [String],
        enum: ["Oneway Trip", "Round Trip", "Local Rental Trip"],
        required: true
    },
    status: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
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

module.exports = mongoose.model('Tax', schema);
