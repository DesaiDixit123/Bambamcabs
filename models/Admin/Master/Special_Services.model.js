let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate-v2');

let schema = new mongoose.Schema({
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    description: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
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

module.exports = mongoose.model('SpecialServices', schema);
