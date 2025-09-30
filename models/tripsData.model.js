let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate-v2');

let tripSchema = new mongoose.Schema({
    from: {
        type: String
    },
    to: {
        type: String
    },
    city: { 
        type: String,
        default: ''
    },
    trip_type: {  
        type: String,
        enum: ['Oneway', 'Round Trip', 'Local Rental Trip']
    },
    vehicleIds: [{
        type: mongoose.Types.ObjectId, // Vehicle collection ni ObjectId
        ref: 'vehicletypes'
    }],
    priceCalculation: [{
        perDay: {
            type: Number,
            default: 0
        },
        perKm: {
            type: Number,
            default: 0
        },
        perHour: {
            type: Number,
            default: 0
        },
        totalPrice: {   // 🔹 per-vehicle total
            type: Number,
            default: 0
        }
    }],
    totalKm: {
        type: Number,
        default: 0
    },
    totalPrice: {   // 🔹 Trip-level grand total
        type: Number,
        default: 0
    },
    description: {
        type: String,
        default: ''
    },
    status: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Types.ObjectId,
        default: null
    },
    updatedBy: {
        type: mongoose.Types.ObjectId,
        default: null
    },
    createAtTimestamp: {
        type: Number,
        default: Date.now
    },
    updateAtTimestamp: {
        type: Number,
        default: Date.now
    }
}, { timestamps: true, strict: false, autoIndex: true });

tripSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('trips', tripSchema);
