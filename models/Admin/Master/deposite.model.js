let mongoose = require("mongoose");
let mongoosePaginate = require('mongoose-paginate-v2');

const depositSchema = new mongoose.Schema({
    vendorType: { 
        type: String, 
        enum: ["Individual Owner", "Company Owner"], 
        required: true 
    },
    adminId: {   // 👈 vendorId replace with adminId
        type: mongoose.Types.ObjectId, 
        ref: "admins", 
        required: true 
    },
    depositAmount: { 
        type: Number, 
        required: true 
    },
    paymentModeAllowed: {  // 👈 new field
        type: [String], 
        enum: ["UPI", "Net Banking", "Card", "Wallet"],
        default: ["UPI", "Net Banking", "Card", "Wallet"]
    },
    status: { 
        type: Boolean, 
        default: true 
    },
    createdBy: { type: mongoose.Types.ObjectId, ref: "admins" },
    updatedBy: { type: mongoose.Types.ObjectId, ref: "admins" },
    createdAtTimestamp: { type: Number, default: Date.now },
    updatedAtTimestamp: { type: Number, default: Date.now }
});
depositSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("deposits", depositSchema);
