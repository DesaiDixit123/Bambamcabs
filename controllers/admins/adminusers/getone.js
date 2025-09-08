const mongoConnection = require('../../../utilities/connections');
const responseManager = require('../../../utilities/response.manager');
const constants = require('../../../utilities/constants');
const config = require('../../../utilities/config');
const helper = require('../../../utilities/helper');
const adminsModel = require('../../../models/admins.model');
const rolesModel = require('../../../models/roles.model');
const mongoose = require('mongoose');
exports.getoneadminuser = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { adminuserid } = req.body;
    if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
        let primary = mongoConnection.useDb(constants.DEFAULT_DB);
        let adminData = await primary.model(constants.MODELS.admins, adminsModel).findById(req.token.adminId).lean();
        if (adminData && adminData != null && adminData.status === true) {
            let havepermission = await config.getPermission(adminData.roleid, 'admins', 'view');
            if (havepermission) {
                if (adminuserid && adminuserid != null && adminuserid != undefined && adminuserid.trim() != '' && mongoose.Types.ObjectId.isValid(adminuserid)) {
                    let adminuser = await primary.model(constants.MODELS.admins, adminsModel).findById(adminuserid).populate([
                        { path: 'roleid', model: primary.model(constants.MODELS.roles, rolesModel), select: "name" },
                        { path: 'createdBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" },
                        { path: 'updatedBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" }
                    ]).lean();
                    adminuser.login_password = await helper.passwordDecryptor(adminuser.login_password);
                    return responseManager.onSuccess('Admin Users Data !', adminuser, res);
                } else {
                    return responseManager.badrequest({ message: 'Invalid Admin User ID to get user data, Please provide valid admin id and try again...!' }, res);
                }
            } else {
                return responseManager.accessDenied(res);
            }
        } else {
            return responseManager.unauthorisedRequest(res);
        }
    } else {
        return responseManager.unauthorisedRequest(res);
    }
};