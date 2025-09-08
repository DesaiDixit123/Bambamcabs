let mongoose = require("mongoose");
let mongoosePaginate = require("mongoose-paginate-v2");
let schema = new mongoose.Schema({
	profile: {
		type: String,
		default: ''
	},
	name: {
		type: String,
		require: true
	},
	country_code: {
		type: String,
		require: true
	},
	mobile: {
		type: String,
		require: true
	},
	country_wise_contact: {},
	email: {
		type: String,
		require: true
	},
	roleid: {
		type: mongoose.Types.ObjectId,
		require: true
	},
	login_username: {
		type: String,
		require: true
	},
	login_password: {
		type: String,
		require: true
	},
	fcm_token: {
		type: String,
		default: ''
	},
	channelID: {
		type: String,
		default: ''
	},
	status: {
		type: Boolean,
		default: true
	},
	email_verified: {
		type: Boolean,
		default: false
	},
	is_pinset: {
		type: Boolean,
		default: false
	},
	lastsentotp: {
		type: String,
		default: ''
	},
	lastsentotptimestamp: {
		type: Number,
		default: 0
	},
	createdAtTimestamp: {
		type: Number,
		require: true
	},
	updatedAtTimestamp: {
		type: Number,
		require: true
	},
	createdBy: {
		type: mongoose.Types.ObjectId,
		require: true
	},
	updatedBy: {
		type: mongoose.Types.ObjectId,
		require: true
	}
}, { timestamps: true, strict: false, autoIndex: true });
schema.plugin(mongoosePaginate);
module.exports = schema;