const mongoConnection = require('../../../utilities/connections');
const responseManager = require('../../../utilities/response.manager');
const constants = require('../../../utilities/constants');
const config = require('../../../utilities/config');
const helper = require('../../../utilities/helper');
const adminsModel = require('../../../models/admins.model');
const rolesModel = require('../../../models/roles.model');
const mongoose = require('mongoose');
exports.withpagination = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { page, limit, search, status } = req.body;
    if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
        let primary = mongoConnection.useDb(constants.DEFAULT_DB);
        let adminData = await primary.model(constants.MODELS.admins, adminsModel).findById(req.token.adminId).lean();
        if (adminData && adminData != null && adminData.status === true) {
            let havepermission = await config.getPermission(adminData.roleid, 'admins', 'view');
            if (havepermission) {
                let filter = {};
                if (status === true || status === false) {
                    filter.status = status;
                }
                primary.model(constants.MODELS.admins, adminsModel).paginate({
                    $or: [
                        { name: { '$regex': new RegExp(search, "i") } },
                        { mobile: { '$regex': new RegExp(search, "i") } },
                        { email: { '$regex': new RegExp(search, "i") } },
                        { login_username: { '$regex': new RegExp(search, "i") } }
                    ],
                    ...filter
                }, {
                    page,
                    limit: parseInt(limit),
                    sort: { "_id": -1 },
                    populate: [
                        { path: 'roleid', model: primary.model(constants.MODELS.roles, rolesModel), select: "name" },
                        { path: 'createdBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" },
                        { path: 'updatedBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" }
                    ],
                    lean: true
                }).then((adminuserlist) => {
                    return responseManager.onSuccess('Admin Users List !', adminuserlist, res);
                }).catch((error) => {
                    return responseManager.onError(error, res);
                });
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
exports.withoutpagination = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
        const { search } = req.body;
        let primary = mongoConnection.useDb(constants.DEFAULT_DB);
        let adminData = await primary.model(constants.MODELS.admins, adminsModel).findById(req.token.adminId).lean();
        if (adminData && adminData != null && adminData.status === true) {
            let havepermission = await config.getPermission(adminData.roleid, 'admins', 'view');
            if (havepermission) {
                let allactiveadminusers = await primary.model(constants.MODELS.admins, adminsModel).find({
                    $or: [
                        { name: { '$regex': new RegExp(search, "i") } },
                        { mobile: { '$regex': new RegExp(search, "i") } },
                        { email: { '$regex': new RegExp(search, "i") } },
                        { login_username: { '$regex': new RegExp(search, "i") } }
                    ],
                    status: true
                }).populate([
                    { path: 'roleid', model: primary.model(constants.MODELS.roles, rolesModel), select: "name" },
                    { path: 'createdBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" },
                    { path: 'updatedBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" }
                ]).lean();
                return responseManager.onSuccess('Admin Users List !', allactiveadminusers, res);
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