const mongoConnection = require('../../../utilities/connections');
const responseManager = require('../../../utilities/response.manager');
const constants = require('../../../utilities/constants');
const config = require('../../../utilities/config');
const adminsModel = require('../../../models/admins.model');
const rolesModel = require('../../../models/roles.model');
const mongoose = require('mongoose');
const async = require('async');
exports.getpermission = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
        let primary = mongoConnection.useDb(constants.DEFAULT_DB);
        let adminData = await primary.model(constants.MODELS.admins, adminsModel).findById(req.token.adminId).lean();
        if (adminData && adminData != null && adminData.status === true) {
            let finalpermission = [];
            async.forEachSeries(config.adminCollections, (permission, next_permission) => {
                let obj = {
                    displayname: permission.text,
                    collectionName: permission.value,
                    insert: false,
                    update: false,
                    delete: false,
                    view: false
                };
                finalpermission.push(obj);
                next_permission();
            }, () => {
                return responseManager.onSuccess('Permission details...', finalpermission, res);
            });
        } else {
            return responseManager.unauthorisedRequest(res);
        }
    } else {
        return responseManager.unauthorisedRequest(res);
    }
};