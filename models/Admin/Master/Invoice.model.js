const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const invoiceSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "admins"
    },
    logo: {
        type: String, // URL or file path of uploaded logo
        required: false
    },
    company_name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    mobile_no: {
        type: String,
        required: true,
        trim: true,
        match: /^[0-9]{10}$/   // 10 digit mobile number
    },
    gst_no: {
        type: String,
        required: false,
        trim: true
    },
    applicable_on: [
        {
            type: String,
            enum: ["One Way Trip", "Round Trip", "Local Rental Trip"],
            required: true
        }
    ],
    terms_conditions: {
        type: String,
        required: true,
        trim: true,
        minlength: 5
    },
    status: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Number,
        default: Date.now
    },
    updatedAt: {
        type: Number,
        default: Date.now
    }
});

invoiceSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("invoices", invoiceSchema);
