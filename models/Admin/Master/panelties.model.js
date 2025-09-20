let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate-v2');

let schema = new mongoose.Schema({
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    amount: {
        type: Number,
        required: true   // ✅ require → required
    },
    category: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    applicable_on: {   // ✅ tamara form ma "Applicable On" che, etle add karyu
        type: [String],
        enum: ["Website", "User Application", "Driver Application", "Vendor"],
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

module.exports = mongoose.model('Penalty', schema);
