let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate-v2');
let schema = new mongoose.Schema({
    amount : {
        type: Number,
        require: true
    },
    category : {
        type: String,
        require: true
    },
    description : {
        type : String,
        require : true
    },
    status : {
        type : Boolean,
        default : false
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