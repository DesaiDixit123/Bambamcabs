const mongoConnection = require('../../../utilities/connections');
const responseManager = require('../../../utilities/response.manager');
const constants = require('../../../utilities/constants');
const helper = require('../../../utilities/helper');
const adminsModel = require('../../../models/admins.model');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
exports.forgetpassword = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { email } = req.body;
    if (email && email.trim() != '' && email != null && email != undefined && /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        let primary = mongoConnection.useDb(constants.DEFAULT_DB);
        let adminData = await primary.model(constants.MODELS.admins, adminsModel).findOne({ email: email }).lean();
        if (adminData && adminData != null && adminData.status === true) {
            // if (adminData.is_pinset === true) {
                if (adminData.email_verified === false) {
                    let otp = await helper.generateotp(6);
                    await primary.model(constants.MODELS.admins, adminsModel).findByIdAndUpdate(adminData._id, { lastsentotp: otp, lastsentotptimestamp: Date.now() });
                    let mailTransporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: process.env.EMAIL,
                            pass: process.env.PASSWORD
                        }
                    });
                    let mailDetails = {
                        from: process.env.EMAIL,
                        to: email,
                        subject: 'OTP For Forget Password',
                        text: `Your OTP For Forget Password Is: ${otp}`
                    };
                    mailTransporter.sendMail(mailDetails, function (error, data) {
                        if (error) {
                            return responseManager.onError(error, res);
                        } else {
                            return responseManager.onSuccess('Otp send successfully...', 1, res);
                        }
                    });
                } else {
                    return responseManager.onSuccess('Your email is verified, Please set your password first.', { is_pinset: false }, res);
                }
            // } else {
            //     return responseManager.badrequest({ message: 'You have not set your password, so you can not forgot...!' }, res);
            // }
        } else {
            return responseManager.badrequest({ message: 'Invalid email to forgot password, Please provide valid email and try again...!' }, res);
        }
    } else {
        return responseManager.badrequest({ message: 'Invalid email to forgot password, Please provide valid email and try again...!' }, res);
    }
};