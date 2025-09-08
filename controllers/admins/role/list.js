const mongoConnection = require('../../../utilities/connections');
const responseManager = require('../../../utilities/response.manager');
const constants = require('../../../utilities/constants');
const config = require('../../../utilities/config');
const adminsModel = require('../../../models/admins.model');
const rolesModel = require('../../../models/roles.model');
const mongoose = require('mongoose');
exports.withPagination = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
        const { page, limit, search, status } = req.body;
        let primary = mongoConnection.useDb(constants.DEFAULT_DB);
        let adminData = await primary.model(constants.MODELS.admins, adminsModel).findById(req.token.adminId).lean();
        if (adminData && adminData != null && adminData.status === true) {
            let havepermission = await config.getPermission(adminData.roleid, 'roles', 'view');
            if (havepermission) {
                let filter = {};
                if (status === true || status === false) {
                    filter.status = status;
                }
                primary.model(constants.MODELS.roles, rolesModel).paginate({
                    name: { '$regex': new RegExp(search, "i") },
                    ...filter
                }, {
                    page,
                    limit: parseInt(limit),
                    populate: [
                        { path: 'createdBy', model: primary.model(constants.MODELS.admins, adminsModel), select: 'name email mobile' },
                        { path: 'updatedBy', model: primary.model(constants.MODELS.admins, adminsModel), select: 'name email mobile' }
                    ],
                    sort: { _id: -1 },
                    lean: true
                }).then((rolesData) => {
                    return responseManager.onSuccess('All role list...', rolesData, res);
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
exports.withOutPagination = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
        const { search } = req.body;
        let primary = mongoConnection.useDb(constants.DEFAULT_DB);
        let adminData = await primary.model(constants.MODELS.admins, adminsModel).findById(req.token.adminId).lean();
        if (adminData && adminData != null && adminData.status === true) {
            let havepermission = await config.getPermission(adminData.roleid, 'roles', 'view');
            if (havepermission) {
                let rolesData = await primary.model(constants.MODELS.roles, rolesModel).find({
                    name: { '$regex': new RegExp(search, "i") },
                    status: true
                }).populate([
                    { path: 'createdBy', model: primary.model(constants.MODELS.admins, adminsModel), select: 'name email mobile' },
                    { path: 'updatedBy', model: primary.model(constants.MODELS.admins, adminsModel), select: 'name email mobile' }
                ]).sort({ _id: -1 }).lean();
                return responseManager.onSuccess('All role list...', rolesData, res);
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