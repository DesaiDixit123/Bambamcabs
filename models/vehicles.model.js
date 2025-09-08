let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate-v2');
let schema = new mongoose.Schema({
    vendor_id : {
        type: mongoose.Types.ObjectId,
        require: true
    },
    car_photo : {
        type: String,
        require: true
    },
    brand_name : {
        type: String,
        require: true
    },
    vehicale_type : {
        type: mongoose.Types.ObjectId,
        require: true
    },
    vehicale_number : {
        type: String,
        require: true
    },
    fuel_type : {
        type: mongoose.Types.ObjectId,
        require: true
    },
    vehicle_make_year : {
        type: String,
        require : true
    },
    sourcing : {
        type: String,
        require : true
    },
    pet_friendly : {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No'
    },
    luggage_carrier : {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No'
    },
    working_rear_seat_belts : {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No'
    },
    insurance_expiry : {
        type: String,
        require : true
    },
    fitness_expiry : {
        type: String,
        require : true
    },
    permit_expiry : {
        type: String,
        require : true
    },
    permit_type : {
        type : String,
        require : true
    },
    insurance_document : {
        type : String,
        require : true
    },
    fitness_document : {
        type : String,
        require : true
    },
    permit_document : {
        type : String,
        require : true
    },
    puc_document : {
        type : String,
        require : true
    },
    rc_image : {
        type : String,
        require : true
    },
    status : {
        type : Boolean,
        default : false
    },
    approval_status : { 
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    approve_reject_by : {
        type: mongoose.Types.ObjectId,
        require: true
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
module.exports = schema;