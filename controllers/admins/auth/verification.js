const mongoConnection = require('../../../utilities/connections');
const responseManager = require('../../../utilities/response.manager');
const constants = require('../../../utilities/constants');
const helper = require('../../../utilities/helper');
const adminsModel = require('../../../models/admins.model');
const mongoose = require('mongoose');
exports.verificationotp = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { email, otp } = req.body;
    if (email && email.trim() != '' && email != null && email != undefined && /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        if (otp && otp.trim() != '' && otp.length === 6) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel).findOne({ email: email }).lean();
            if (adminData && adminData != null && adminData.status === true) {
                if (adminData.lastsentotp === otp) {
                    let otptimestamp = adminData.lastsentotptimestamp;
                    otptimestamp = parseInt(otptimestamp + 300000);
                    let currentTimestamp = Date.now();
                    if (currentTimestamp <= otptimestamp) {
                        await primary.model(constants.MODELS.admins, adminsModel).findByIdAndUpdate(adminData._id, { email_verified: true });
                        return responseManager.onSuccess('OTP verified successfully...', 1, res);
                    } else {
                        return responseManager.badrequest({ message: 'OTP is expired, Please provide valid OTP and try again' }, res);
                    }
                } else {
                    return responseManager.badrequest({ message: 'Invalid otp for verification...!' }, res);
                }
            } else {
                return responseManager.badrequest({ message: 'Invalid email to verify otp, Please provide valid email and try again...!' }, res);
            }
        } else {
            return responseManager.badrequest({ message: 'Invalid otp for verification...!' }, res);
        }
    } else {
        return responseManager.badrequest({ message: 'Invalid email to verify otp, Please provide valid email and try again...!' }, res);
    }
};