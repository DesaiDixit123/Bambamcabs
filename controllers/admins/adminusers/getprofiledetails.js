const mongoConnection = require('../../../utilities/connections');
const responseManager = require('../../../utilities/response.manager');
const constants = require('../../../utilities/constants');
const adminsModel = require('../../../models/admins.model');
const rolesModel = require('../../../models/roles.model');
const mongoose = require('mongoose');
exports.getadminprofile = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
        let primary = mongoConnection.useDb(constants.DEFAULT_DB);
        let adminData = await primary.model(constants.MODELS.admins, adminsModel).findById(req.token.adminId).populate([
            { path: 'roleid', model: primary.model(constants.MODELS.roles, rolesModel), select: "name permissions status" },
            { path: 'createdBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" },
            { path: 'updatedBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" }
        ]).lean();
        return responseManager.onSuccess('Admin Users Data !', adminData, res);
    } else {
        return responseManager.unauthorisedRequest(res);
    }
};