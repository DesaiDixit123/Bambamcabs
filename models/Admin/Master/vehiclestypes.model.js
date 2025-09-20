// let mongoose = require('mongoose');
// let mongoosePaginate = require('mongoose-paginate-v2');

// let schema = new mongoose.Schema({
//     name: {
//         type: String,
//         required: true
//     },
//     fix_price_per_day: {
//         type: Number,
//         required: true
//     },
//     upto_km: {
//         type: Number,
//         required: true
//     },
//     per_km_price: {
//         type: Number,
//         required: true
//     },
//     per_hour_price: {
//         type: Number,
//         required: true
//     },
//     status: {
//         type: Boolean,
//         default: false
//     },
//     vendor_id: { // optional vendor
//         type: mongoose.Types.ObjectId,
//         default: null
//     },
//     admin_id: { // optional admin
//         type: mongoose.Types.ObjectId,
//         default: null
//     },
//     createdBy: {
//         type: mongoose.Types.ObjectId,
//         required: true
//     },
//     updatedBy: {
//         type: mongoose.Types.ObjectId,
//         required: true
//     },
//     createAtTimestamp: {
//         type: Number,
//         required: true
//     },
//     updateAtTimestamp: {
//         type: Number,
//         required: true
//     }
// }, { timestamps: true, strict: false, autoIndex: true });

// schema.plugin(mongoosePaginate);

// module.exports = mongoose.model('vehicletypes', schema);




let mongoose = require('mongoose');
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

let schema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
  states: [
        {
            state_name: { type: String },
            cities: [
                {
                    city_name: { type: String },
                    fix_price_per_day: { type: Number },
                    upto_km: { type: Number },
                    per_km_price: { type: Number },
                    per_hour_price: { type: Number },
                    status: { type: Boolean, default: true }
                }
            ]
        }
    ],
    status: {
        type: Boolean,
        default: true
    },
    vendor_id: {
        type: mongoose.Types.ObjectId,
        default: null
    },
    admin_id: {
        type: mongoose.Types.ObjectId,
        default: null,

        ref:"admins"
    },
    createdBy: {
        type: mongoose.Types.ObjectId,

    },
    updatedBy: {
        type: mongoose.Types.ObjectId,

    },
    createAtTimestamp: {
        type: Number,

    },
    updateAtTimestamp: {
        type: Number,

    }
}, { timestamps: true, strict: false, autoIndex: true });

schema.plugin(aggregatePaginate);
module.exports = mongoose.model('vehicletypes', schema);
