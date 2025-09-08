const mongoConnection = require('../../../utilities/connections');
const responseManager = require('../../../utilities/response.manager');
const constants = require('../../../utilities/constants');
const config = require('../../../utilities/config');
const adminsModel = require('../../../models/admins.model');
const rolesModel = require('../../../models/roles.model');
const mongoose = require('mongoose');
exports.changeroleStatus = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
        const { rolesid } = req.body;
        let primary = mongoConnection.useDb(constants.DEFAULT_DB);
        let adminData = await primary.model(constants.MODELS.admins, adminsModel).findById(req.token.adminId).lean();
        if (adminData && adminData != null && adminData.status === true) {
            let havepermission = await config.getPermission(adminData.roleid, 'roles', 'update');
            if (havepermission) {
                if (rolesid && rolesid.trim() != '' && rolesid != null && mongoose.Types.ObjectId.isValid(rolesid)) {
                    let rolesData = await primary.model(constants.MODELS.roles, rolesModel).findById(rolesid).lean();
                    if (rolesData && rolesData.ismaster && rolesData.ismaster === true) {
                        return responseManager.badrequest({ message: 'You can not update master role...!' }, res);
                    } else {
                        let obj = {
                            status: (rolesData.status === true) ? false : true
                        };
                        await primary.model(constants.MODELS.roles, rolesModel).findByIdAndUpdate(rolesid, obj);
                        let update = await primary.model(constants.MODELS.roles, rolesModel).findById(rolesid).populate([
                            { path: 'createdBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" },
                            { path: 'updatedBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" }
                        ]).lean();
                        return responseManager.onSuccess('Role status change successfully...', update, res);
                    }
                } else {
                    return responseManager.badrequest({ message: 'Invalid role id, please provide valid role id and try again...!' }, res);
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