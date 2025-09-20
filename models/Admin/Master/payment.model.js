let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate-v2');

let schema = new mongoose.Schema({
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    payment_name: {
        type: String,
        required: true
    },
    advance_payment_percentage: {
        type: Number,
        required: true,
        enum: [0, 25, 50, 75, 100]  // tamara UI ma mostly fixed percentages
    },
    applicable_on: {
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

module.exports = mongoose.model('Payment', schema);
