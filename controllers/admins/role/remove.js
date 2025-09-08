const mongoConnection = require('../../../utilities/connections');
const responseManager = require('../../../utilities/response.manager');
const constants = require('../../../utilities/constants');
const config = require('../../../utilities/config');
const adminsModel = require('../../../models/admins.model');
const rolesModel = require('../../../models/roles.model');
const mongoose = require('mongoose');
exports.removeroles = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
        const { rolesid } = req.body;
        let primary = mongoConnection.useDb(constants.DEFAULT_DB);
        let adminData = await primary.model(constants.MODELS.admins, adminsModel).findById(req.token.adminId).lean();
        if (adminData && adminData != null && adminData.status === true) {
            let havepermission = await config.getPermission(adminData.roleid, 'roles', 'delete');
            if (havepermission) {
                if (rolesid && rolesid.trim() != '' && rolesid != null && mongoose.Types.ObjectId.isValid(rolesid)) {
                    let roleassignData = await primary.model(constants.MODELS.admins, adminsModel).findOne({ roleid: new mongoose.Types.ObjectId(rolesid) }).lean();
                    if (roleassignData == null) {
                        await primary.model(constants.MODELS.roles, rolesModel).findByIdAndDelete(rolesid);
                        return responseManager.onSuccess('Role Delete successfully...', 1, res);
                    } else {
                        return responseManager.badrequest({ message: 'This Role assign to admin so you can not delete...!' }, res);
                    }
                } else {
                    return responseManager.badrequest({ message: 'Invalid roles id...!' }, res);
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