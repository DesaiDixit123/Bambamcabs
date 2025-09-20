let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate-v2');

let schema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    status: {
        type: Boolean,
        default: false
    },
      vendor_id: { // 🔹 vendor ID store
        type: mongoose.Types.ObjectId,
        default: null
    },
    admin_id: { // 🔹 admin ID store
        type: mongoose.Types.ObjectId,
        default: null
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

schema.plugin(mongoosePaginate);

module.exports = mongoose.model('fueltypes', schema);