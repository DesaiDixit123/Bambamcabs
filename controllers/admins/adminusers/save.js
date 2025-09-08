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
exports.saveadminuser = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    var { adminuserid, roleid, name, country_code, mobile, country_wise_contact, email, login_username, login_password } = req.body;
    if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
        let primary = mongoConnection.useDb(constants.DEFAULT_DB);
        let adminData = await primary.model(constants.MODELS.admins, adminsModel).findById(req.token.adminId).lean();


            console.log("➡ Files received:", req.files);
    console.log("➡ Body received:", req.body);
        if (adminData && adminData != null && adminData.status === true) {
            if (roleid && roleid != null && roleid != undefined && roleid.trim() != '' && mongoose.Types.ObjectId.isValid(roleid)) {
                if (name && name.trim() != '' && name != null && name != undefined) {
                    if (country_code && country_code.trim() != '' && country_code != null && country_code != undefined) {
                        if (mobile && mobile.trim() != '' && mobile != null && mobile != undefined && ((country_code != '+91' && mobile.length >= 7) || (country_code == '+91' && mobile.length == 10))) {
                            if (email && email.trim() != '' && email != null && email != undefined && /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
                                if (login_username && login_username.trim() != '' && login_username != null && login_username != undefined) {
                                    if (login_password && login_password.trim() != '' && login_password != null && login_password != undefined) {
                                        let enPass = await helper.passwordEncryptor(login_password);
                                        country_wise_contact = (country_wise_contact) ? JSON.parse(country_wise_contact) : {};
                                        if (adminuserid && adminuserid != null && adminuserid != undefined && adminuserid.trim() != '' && mongoose.Types.ObjectId.isValid(adminuserid)) {
                                            let havepermission = await config.getPermission(adminData.roleid, 'admins', 'update');
                                            if (havepermission) {
                                                let mainadmindata = await primary.model(constants.MODELS.admins, adminsModel).findById(adminuserid).lean();
                                                if (mainadmindata) {
                                                    if (mainadmindata.ismaster && mainadmindata.ismaster == true) {
                                                        return responseManager.badrequest({ message: 'Admin user is master, You can not change data for this user ...!' }, res);
                                                    } else {
                                                        let checkexisting = await primary.model(constants.MODELS.admins, adminsModel).findOne({
                                                            _id: { $ne: new mongoose.Types.ObjectId(adminuserid) },
                                                            $or: [
                                                                { mobile: mobile },
                                                                { email: email },
                                                                { login_username: login_username }
                                                            ]
                                                        }).lean();
                                                        if (checkexisting == null) {
                                                            if (req.file) {
                                                                if (req.file.mimetype) {
                                                                    if (allowedContentTypes.imagearray.includes(req.file.mimetype)) {
                                                                        let filesizeinMb = parseFloat(parseFloat(req.file.size) / 1048576);
                                                                        if (filesizeinMb <= 5) {
                                                                            let uploadResult = await AwsCloud.saveToS3(req.file.buffer, 'admin', req.file.mimetype, 'profile');
                                                                            let obj = {
                                                                                profile: uploadResult.data.Key,
                                                                                name: name,
                                                                                country_code: country_code,
                                                                                mobile: mobile,
                                                                                country_wise_contact: (country_wise_contact && typeof country_wise_contact === 'object') ? country_wise_contact : {},
                                                                                email: email,
                                                                                roleid: new mongoose.Types.ObjectId(roleid),
                                                                                login_username: login_username,
                                                                                login_password: enPass,
                                                                                channelID: mobile.toString() + '_' + adminuserid.toString().toUpperCase(),
                                                                                updatedAtTimestamp: Date.now(),
                                                                                updatedBy: new mongoose.Types.ObjectId(req.token.adminId),
                                                                            };
                                                                            await primary.model(constants.MODELS.admins, adminsModel).findByIdAndUpdate(adminuserid, obj);
                                                                            let adminuserdataresponse = await primary.model(constants.MODELS.admins, adminsModel).findById(adminuserid).populate([
                                                                                { path: 'roleid', model: primary.model(constants.MODELS.roles, rolesModel), select: "name" },
                                                                                { path: 'createdBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" },
                                                                                { path: 'updatedBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" }
                                                                            ]).lean();
                                                                            return responseManager.onSuccess('Admin user updated successfully!', adminuserdataresponse, res);
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
                                                                let obj = {
                                                                    name: name,
                                                                    country_code: country_code,
                                                                    mobile: mobile,
                                                                    country_wise_contact: (country_wise_contact && typeof country_wise_contact === 'object') ? country_wise_contact : {},
                                                                    email: email,
                                                                    roleid: new mongoose.Types.ObjectId(roleid),
                                                                    login_username: login_username,
                                                                    login_password: enPass,
                                                                    channelID: mobile.toString() + '_' + adminuserid.toString().toUpperCase(),
                                                                    updatedAtTimestamp: Date.now(),
                                                                    updatedBy: new mongoose.Types.ObjectId(req.token.adminId),
                                                                };
                                                                await primary.model(constants.MODELS.admins, adminsModel).findByIdAndUpdate(adminuserid, obj);
                                                                let adminuserdataresponse = await primary.model(constants.MODELS.admins, adminsModel).findById(adminuserid).populate([
                                                                    { path: 'roleid', model: primary.model(constants.MODELS.roles, rolesModel), select: "name" },
                                                                    { path: 'createdBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" },
                                                                    { path: 'updatedBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" }
                                                                ]).lean();
                                                                return responseManager.onSuccess('Admin user updated successfully!', adminuserdataresponse, res);
                                                            }
                                                        } else {
                                                            return responseManager.badrequest({ message: 'Admin user already exist with identical email or mobile number ...!' }, res);
                                                        }
                                                    }
                                                } else {
                                                    return responseManager.badrequest({ message: 'Invalid Admin user ID to update user data ...!' }, res);
                                                }
                                            } else {
                                                return responseManager.accessDenied(res);
                                            }
                                        } else {
                                            let havepermission = await config.getPermission(adminData.roleid, 'admins', 'insert');
                                            if (havepermission) {
                                                let checkexisting = await primary.model(constants.MODELS.admins, adminsModel).findOne({
                                                    $or: [
                                                        { mobile: mobile },
                                                        { email: email },
                                                        { login_username: login_username }
                                                    ]
                                                }).lean();
                                                if (checkexisting == null) {
                                                    if (req.file) {
                                                        if (req.file.mimetype) {
                                                            if (allowedContentTypes.imagearray.includes(req.file.mimetype)) {
                                                                let filesizeinMb = parseFloat(parseFloat(req.file.size) / 1048576);
                                                                if (filesizeinMb <= 5) {
                                                                    let uploadResult = await AwsCloud.saveToS3(req.file.buffer, 'admin', req.file.mimetype, 'profile');
                                                                    let obj = {
                                                                        profile: uploadResult.data.Key,
                                                                        name: name,
                                                                        country_code: country_code,
                                                                        mobile: mobile,
                                                                        country_wise_contact: (country_wise_contact && typeof country_wise_contact === 'object') ? country_wise_contact : {},
                                                                        email: email,
                                                                        roleid: new mongoose.Types.ObjectId(roleid),
                                                                        login_username: login_username,
                                                                        login_password: enPass,
                                                                        email_verified: false,
                                                                        is_pinset: false,
                                                                        lastsentotp: '',
                                                                        lastsentotptimestamp: 0,
                                                                        fcm_token: '',
                                                                        channelID: '',
                                                                        status: true,
                                                                        createdAtTimestamp: Date.now(),
                                                                        updatedAtTimestamp: Date.now(),
                                                                        createdBy: new mongoose.Types.ObjectId(req.token.adminId),
                                                                        updatedBy: new mongoose.Types.ObjectId(req.token.adminId),
                                                                    };
                                                                    let adminuserdata = await primary.model(constants.MODELS.admins, adminsModel).create(obj);
                                                                    await primary.model(constants.MODELS.admins, adminsModel).findByIdAndUpdate(adminuserdata._id, { channelID: adminuserdata.mobile.toString() + '_' + adminuserdata._id.toString().toUpperCase() });
                                                                    let adminuserdataresponse = await primary.model(constants.MODELS.admins, adminsModel).findById(adminuserdata._id).populate([
                                                                        { path: 'roleid', model: primary.model(constants.MODELS.roles, rolesModel), select: "name" },
                                                                        { path: 'createdBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" },
                                                                        { path: 'updatedBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" }
                                                                    ]).lean();
                                                                    return responseManager.onSuccess('Admin user created successfully!', adminuserdataresponse, res);
                                                                } else {
                                                                    return responseManager.badrequest({ message: 'file must be less then or equal 5 MB, please try again...!' }, res);
                                                                }
                                                            } else {
                                                                return responseManager.badrequest({ message: 'Please upload valid file for profile, allowed files are photo...!' }, res);
                                                            }
                                                        } else {
                                                            return responseManager.badrequest({ message: 'Please upload valid file for profile...!' }, res);
                                                        }
                                                    } else {
                                                        let obj = {
                                                            name: name,
                                                            country_code: country_code,
                                                            mobile: mobile,
                                                            country_wise_contact: (country_wise_contact && typeof country_wise_contact === 'object') ? country_wise_contact : {},
                                                            email: email,
                                                            roleid: new mongoose.Types.ObjectId(roleid),
                                                            login_username: login_username,
                                                            login_password: enPass,
                                                            email_verified: false,
                                                            is_pinset: false,
                                                            lastsentotp: '',
                                                            lastsentotptimestamp: 0,
                                                            fcm_token: '',
                                                            channelID: '',
                                                            status: true,
                                                            createdAtTimestamp: Date.now(),
                                                            updatedAtTimestamp: Date.now(),
                                                            createdBy: new mongoose.Types.ObjectId(req.token.adminId),
                                                            updatedBy: new mongoose.Types.ObjectId(req.token.adminId),
                                                        };
                                                        let adminuserdata = await primary.model(constants.MODELS.admins, adminsModel).create(obj);
                                                        await primary.model(constants.MODELS.admins, adminsModel).findByIdAndUpdate(adminuserdata._id, { channelID: adminuserdata.mobile.toString() + '_' + adminuserdata._id.toString().toUpperCase() });
                                                        let adminuserdataresponse = await primary.model(constants.MODELS.admins, adminsModel).findById(adminuserdata._id).populate([
                                                            { path: 'roleid', model: primary.model(constants.MODELS.roles, rolesModel), select: "name" },
                                                            { path: 'createdBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" },
                                                            { path: 'updatedBy', model: primary.model(constants.MODELS.admins, adminsModel), select: "name email mobile" }
                                                        ]).lean();
                                                        return responseManager.onSuccess('Admin user created successfully!', adminuserdataresponse, res);
                                                    }
                                                } else {
                                                    return responseManager.badrequest({ message: 'Admin user already exist with identical email or mobile number...!' }, res);
                                                }
                                            } else {
                                                return responseManager.accessDenied(res);
                                            }
                                        }
                                    } else {
                                        return responseManager.badrequest({ message: 'Invalid login password, Please provide valid login password and try again...!' }, res);
                                    }
                                } else {
                                    return responseManager.badrequest({ message: 'Invalid login username, Please provide valid login username and try again...!' }, res);
                                }
                            } else {
                                return responseManager.badrequest({ message: 'Invalid email ID to create or update admin, Please provide valid email and try again...!' }, res);
                            }
                        } else {
                            return responseManager.badrequest({ message: 'Invalid mobile number to create or update admin, Please provide valid number and try again...!' }, res);
                        }
                    } else {
                        return responseManager.badrequest({ message: 'Invalid country code to create or update admin ...!' }, res);
                    }
                } else {
                    return responseManager.badrequest({ message: 'Invalid name for admin, Please provide valid name and try again...!' }, res);
                }
            } else {
                return responseManager.badrequest({ message: 'Invalid role ID to create or update admin ...!' }, res);
            }
        } else {
            return responseManager.unauthorisedRequest(res);
        }
    } else {
        return responseManager.unauthorisedRequest(res);
    }
};