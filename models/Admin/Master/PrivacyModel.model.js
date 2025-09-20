let mongoose = require("mongoose");
let mongoosePaginate = require('mongoose-paginate-v2');

let privacyPolicySchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "admins"
  },
  policy_name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3
  },
  applicable_on: [
    {
      type: String,
      enum: ["Website", "User Application", "Driver Application"],
      required: true
    }
  ],
  policy_description: {
    type: String,
    required: true,
    trim: true
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
  },
   createdBy: { type: mongoose.Types.ObjectId, ref: "admins" },
      updatedBy: { type: mongoose.Types.ObjectId, ref: "admins" },
});
privacyPolicySchema.plugin(mongoosePaginate);
module.exports = mongoose.model("privacy_policies", privacyPolicySchema);
