const mongoConnection = require('../../../utilities/connections');
const responseManager = require('../../../utilities/response.manager');
const constants = require('../../../utilities/constants');
const helper = require('../../../utilities/helper');
const adminsModel = require('../../../models/admins.model');
const rolesModel = require('../../../models/roles.model');
const mongoose = require('mongoose');
exports.setpassword = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { email, password } = req.body;
    if (email && email.trim() != '' && /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        if (password && password.trim() != '' && password != null) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel).findOne({ email: email }).populate({ path: 'roleid', model: primary.model(constants.MODELS.roles, rolesModel) }).lean();
            if (adminData && adminData != null && adminData.status === true) {
                if (adminData.email_verified === true) {
                    let enpass = await helper.passwordEncryptor(password);
                    await primary.model(constants.MODELS.admins, adminsModel).findByIdAndUpdate(adminData._id, { login_password: enpass, is_pinset: true, email_verified: false });
                    let accesstoken = await helper.generateAccessToken({ adminId: adminData._id.toString() });
                    return responseManager.onSuccess('Admin login successfully...', { accesstoken: accesstoken, admindetails: adminData }, res);
                } else {
                    return responseManager.badrequest({ message: 'You are not authorized to set your password...!' }, res);
                }
            } else {
                return responseManager.badrequest({ message: 'Invalid email to set your password...!' }, res);
            }
        } else {
            return responseManager.badrequest({ message: 'Invalid password, Please provide valid password and try again...!' }, res);
        }
    } else {
        return responseManager.badrequest({ message: 'Invalid email to set your password...!' }, res);
    }
};