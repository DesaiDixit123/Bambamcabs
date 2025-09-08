const mongoConnection = require('../../../utilities/connections');
const responseManager = require('../../../utilities/response.manager');
const constants = require('../../../utilities/constants');
const config = require('../../../utilities/config');
const helper = require('../../../utilities/helper');
const adminsModel = require('../../../models/admins.model');
const rolesModel = require('../../../models/roles.model');
const AwsCloud = require('../../../utilities/aws');
const allowedContentTypes = require('../../../utilities/content-types');
const mongoose = require('mongoose');
exports.editprofile = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { name } = req.body;
    if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
        let primary = mongoConnection.useDb(constants.DEFAULT_DB);
        let adminData = await primary.model(constants.MODELS.admins, adminsModel).findById(req.token.adminId).lean();
        if (adminData && adminData != null && adminData.status === true) {
            if (name && name.trim() != '' && name != null && name != undefined) {
                if (req.file) {
                    if (req.file.mimetype) {
                        if (allowedContentTypes.imagearray.includes(req.file.mimetype)) {
                            let filesizeinMb = parseFloat(parseFloat(req.file.size) / 1048576);
                            if (filesizeinMb <= 5) {
                                let uploadResult = await AwsCloud.saveToS3(req.file.buffer, 'admin', req.file.mimetype, 'profile');
                                let obj = {
                                    profile: uploadResult.data.Key,
                                    name: name
                                };
                                await primary.model(constants.MODELS.admins, adminsModel).findByIdAndUpdate(adminData._id, obj);
                                let adminuserdataresponse = await primary.model(constants.MODELS.admins, adminsModel).findById(adminData._id).populate([
                                    { path: 'roleid', model: primary.model(constants.MODELS.roles, rolesModel), select: "name" },
                                    { path: 'createdBy', model: primary.model(constants.MODELS.admins, adminsModel), select: 'name mobile email' },
                                    { path: 'updatedBy', model: primary.model(constants.MODELS.admins, adminsModel), select: 'name mobile email' },
                                ]).lean();
                                return responseManager.onSuccess('Profile updated successfully!', adminuserdataresponse, res);
                            } else {
                                return responseManager.badrequest({ message: 'file must be less then or equal 5 MB, please try again...!' }, res);
                            }
                        } else {
                            return responseManager.badrequest({ message: 'Please upload valid file for profile, allowed files are photos...!' }, res);
                        }
                    } else {
                        return responseManager.badrequest({ message: 'Please upload valid file for profile...!' }, res);
                    }
                } else {
                    await primary.model(constants.MODELS.admins, adminsModel).findByIdAndUpdate(adminData._id, { name: name });
                    let updatedadminData = await primary.model(constants.MODELS.admins, adminsModel).findById(adminData._id).populate([
                        { path: 'roleid', model: primary.model(constants.MODELS.roles, rolesModel), select: "name" },
                        { path: 'createdBy', model: primary.model(constants.MODELS.admins, adminsModel), select: 'name mobile email' },
                        { path: 'updatedBy', model: primary.model(constants.MODELS.admins, adminsModel), select: 'name mobile email' },
                    ]).lean();
                    return responseManager.onSuccess('Profile updated successfully...', updatedadminData, res);
                }
            } else {
                return responseManager.badrequest({ message: 'Invalid name to update profile, please try again with valid name...!' }, res);
            }
        } else {
            return responseManager.unauthorisedRequest(res);
        }
    } else {
        return responseManager.unauthorisedRequest(res);
    }
};