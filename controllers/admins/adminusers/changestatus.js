const mongoConnection = require('../../../utilities/connections');
const responseManager = require('../../../utilities/response.manager');
const constants = require('../../../utilities/constants');
const config = require('../../../utilities/config');
const helper = require('../../../utilities/helper');
const adminsModel = require('../../../models/admins.model');
const rolesModel = require('../../../models/roles.model');
const mongoose = require('mongoose');
exports.changestatus = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { adminuserid } = req.body;
    if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
        let primary = mongoConnection.useDb(constants.DEFAULT_DB);
        let adminData = await primary.model(constants.MODELS.admins, adminsModel).findById(req.token.adminId).lean();
        if (adminData && adminData != null && adminData.status === true) {
            let havepermission = await config.getPermission(adminData.roleid, 'admins', 'update');
            if (havepermission) {
                if (adminuserid && adminuserid != null && adminuserid != undefined && adminuserid.trim() != '' && mongoose.Types.ObjectId.isValid(adminuserid)) {
                    let admindata = await primary.model(constants.MODELS.admins, adminsModel).findById(adminuserid).lean();
                    if (admindata) {
                        if (admindata.ismaster && admindata.ismaster == true) {
                            return responseManager.badrequest({ message: 'Admin user is master, You can not change data for this user ...!' }, res);
                        } else {
                            let obj = {
                                status: (admindata.status && admindata.status === true) ? false : true,
                                updatedAtTimestamp: Date.now(),
                                updatedBy: new mongoose.Types.ObjectId(req.token.adminId)
                            };
                            await primary.model(constants.MODELS.admins, adminsModel).findByIdAndUpdate(adminuserid, obj);
                            let updated = await primary.model(constants.MODELS.admins, adminsModel).findById(adminuserid).populate([
                                { path: 'roleid', model: primary.model(constants.MODELS.roles, rolesModel), select: "name" },
                                { path: 'createdBy', model: primary.model(constants.MODELS.admins, adminsModel), select: 'name mobile email' },
                                { path: 'updatedBy', model: primary.model(constants.MODELS.admins, adminsModel), select: 'name mobile email' },
                            ]).lean();
                            return responseManager.onSuccess('Admin user status change successfully...', updated, res);
                        }
                    } else {
                        return responseManager.badrequest({ message: 'Invalid Admin user ID to update user data ...!' }, res);
                    }
                } else {
                    return responseManager.badrequest({ message: 'Invalid Admin User ID to update status ...!' }, res);
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