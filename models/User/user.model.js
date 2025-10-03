let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate-v2');

let schema = new mongoose.Schema({
    full_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        required: false,   // optional
        match: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
    },
    phone_no: {
        type: String,
        required: false,
        unique: true
    },
    country: {
        type: String,
        required: false
    },
    state: {
        type: String,
        required: false
    },
    city: {
        type: String,
        required: false
    },
    zip_code: {
        type: String,
        required: false   // optional
    },
    profile_image: {
        type: String,
        default: ""       // new field
    },
    user_type: {
        type: Number,
        enum: [1, 2, 3], // 1=Normal, 2=Google, 3=Facebook
        default: 1,
        required: true
    },
    token: {
        type: String,
        default: ""
    },
    fcm_token: {
        type: String,
        default: ""
    },
    password: {
        type: String,
        // required: function () {
        //     return this.user_type === 1; // normal signup mate required
        // }
    },
     otp: {
        type: String,
        default: null   // store latest OTP
    },
    otp_expires: {
        type: Date,
        default: null   // OTP expiry timestamp
    },
    jwt_token:{type:String,default:""},
    created: {
        type: Date,
        default: Date.now
    },
    updated: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true, strict: false, autoIndex: true });

// indexes
schema.index({ email: 1 }, { unique: true, sparse: true });
schema.index({ phone_no: 1 }, { unique: true, sparse: true });

schema.plugin(mongoosePaginate);
module.exports = mongoose.model('User', schema);
