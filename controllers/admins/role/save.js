const mongoConnection = require('../../../utilities/connections');
const responseManager = require('../../../utilities/response.manager');
const constants = require('../../../utilities/constants');
const config = require('../../../utilities/config');
const adminsModel = require('../../../models/admins.model');
const rolesModel = require('../../../models/roles.model');
const mongoose = require('mongoose');
exports.saveroles = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { roleid, name, permissions } = req.body;
    if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
        let primary = mongoConnection.useDb(constants.DEFAULT_DB);
        let adminData = await primary.model(constants.MODELS.admins, adminsModel).findById(req.token.adminId).lean();
        if (adminData && adminData != null && adminData.status === true) {
            if (name && name.trim() != '' && name != null && name != undefined) {
                if (permissions && Array.isArray(permissions) && permissions.length > 0) {
                    if (roleid && roleid.trim() != '' && roleid != null && roleid != undefined && mongoose.Types.ObjectId.isValid(roleid)) {
                        let havepermission = await config.getPermission(adminData.roleid, 'roles', 'update');
                        if (havepermission) {
                            let roleData = await primary.model(constants.MODELS.roles, rolesModel).findById(roleid).lean();
                            if (roleData && roleData.ismaster && roleData.ismaster === true) {
                                return responseManager.badrequest({ message: 'You can not update master role...!' }, res);
                            } else {
                                let checkroleExist = await primary.model(constants.MODELS.roles, rolesModel).findOne({ _id: { $ne: new mongoose.Types.ObjectId(roleid) }, name: new RegExp(["^", name, "$"].join(""), "i") }).lean();
                                if (checkroleExist == null) {
                                    let obj = {
                                        name: name,
                                        permissions: permissions,
                                        updatedAtTimestamp: Date.now(),
                                        updatedBy: new mongoose.Types.ObjectId(req.token.adminId)
                                    };
                                    await primary.model(constants.MODELS.roles, rolesModel).findByIdAndUpdate(roleid, obj);
                                    let updatedRole = await primary.model(constants.MODELS.roles, rolesModel).findById(roleid).populate([
                                        { path: 'createdBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" },
                                        { path: 'updatedBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" }
                                    ]).lean();
                                    return responseManager.onSuccess('Role updated successfully...', updatedRole, res);
                                } else {
                                    return responseManager.badrequest({ message: 'Role already exist with same name...!' }, res);
                                }
                            }
                        } else {
                            return responseManager.accessDenied(res);
                        }
                    } else {
                        let havepermission = await config.getPermission(adminData.roleid, 'roles', 'insert');
                        if (havepermission) {
                            let checkroleExist = await primary.model(constants.MODELS.roles, rolesModel).findOne({ name: new RegExp(["^", name, "$"].join(""), "i") }).lean();
                            if (checkroleExist == null) {
                                let obj = {
                                    name: name,
                                    permissions: permissions,
                                    createdAtTimestamp: Date.now(),
                                    updatedAtTimestamp: Date.now(),
                                    createdBy: new mongoose.Types.ObjectId(req.token.adminId),
                                    updatedBy: new mongoose.Types.ObjectId(req.token.adminId)
                                };
                                let newRole = await primary.model(constants.MODELS.roles, rolesModel).create(obj);
                                let updatedRole = await primary.model(constants.MODELS.roles, rolesModel).findById(newRole._id).populate([
                                    { path: 'createdBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" },
                                    { path: 'updatedBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" }
                                ]).lean();
                                return responseManager.onSuccess('Role created successfully...', updatedRole, res);
                            } else {
                                return responseManager.badrequest({ message: 'Role already exist with same name...!' }, res);
                            }
                        } else {
                            return responseManager.accessDenied(res);
                        }
                    }
                } else {
                    return responseManager.badrequest({ message: 'Invalid permissions...!' }, res);
                }
            } else {
                return responseManager.badrequest({ message: 'Invalid role name...!' }, res);
            }
        } else {
            return responseManager.unauthorisedRequest(res);
        }
    } else {
        return responseManager.unauthorisedRequest(res);
    }
};