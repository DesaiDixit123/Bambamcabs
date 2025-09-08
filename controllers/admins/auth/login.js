const mongoConnection = require('../../../utilities/connections');
const responseManager = require('../../../utilities/response.manager');
const constants = require('../../../utilities/constants');
const helper = require('../../../utilities/helper');
const adminsModel = require('../../../models/admins.model');
const rolesModel = require('../../../models/roles.model');
const mongoose = require('mongoose');



exports.login = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { username, password } = req.body;
    if (username && username.trim() != '' && username != null && username != undefined) {
        if (password && password.trim() != '' && password != null && password != undefined) {
            let primary = mongoConnection.useDb(constants.DEFAULT_DB);
            let adminData = await primary.model(constants.MODELS.admins, adminsModel).findOne({ login_username: username }).populate({ path: 'roleid', model: primary.model(constants.MODELS.roles, rolesModel) }).lean();
            if (adminData && adminData != null && adminData.status === true) {
                let decpass = await helper.passwordDecryptor(adminData.login_password);
                if (decpass == password) {
                    let accesstoken = await helper.generateAccessToken({ adminId: adminData._id.toString() });
                    return responseManager.onSuccess('Admin login successfully...', { accesstoken: accesstoken, admindetails: adminData }, res);
                } else {
                    return responseManager.badrequest({ message: 'Invalid password, Please provide valid password and try again...!' }, res);
                }
            } else {
                return responseManager.badrequest({ message: 'Invalid user name or password...!' }, res);
            }
        } else {
            return responseManager.badrequest({ message: 'Invalid password, Please provide valid password and try again...!' }, res);
        }
    } else {
        return responseManager.badrequest({ message: 'Invalid user name to login, Please provide valid user name and try again...!' }, res);
    }
};