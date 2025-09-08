const mongoConnection = require('../../../utilities/connections');
const responseManager = require('../../../utilities/response.manager');
const constants = require('../../../utilities/constants');
const config = require('../../../utilities/config');
const helper = require('../../../utilities/helper');
const adminsModel = require('../../../models/admins.model');
const vendorsModel = require('../../../models/vendors.model');
const driversModel = require('../../../models/drivers.model');
const vehiclesModel = require('../../../models/vehicles.model');
const vehicale_typesModel = require('../../../models/vehicale_types.model');
const fuel_typesModel = require('../../../models/fuel_types.model');
const rolesModel = require('../../../models/roles.model');
const mongoose = require('mongoose');
exports.savevendor = async (req, res) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const {
        vendorid,
        owner_photo,
        owner_name,
        owner_mobile,
        owner_email,
        owner_city,
        owner_state,
        company_name,
        fleet_size,
        office_photo,
        visiting_card,
        business_license,
        aadhar_pan,
        gst_certificate,
        electricity_bill
    } = req.body;
    if (req.token && mongoose.Types.ObjectId.isValid(req.token.adminId)) {
        let primary = mongoConnection.useDb(constants.DEFAULT_DB);
        let adminData = await primary.model(constants.MODELS.admins, adminsModel).findById(req.token.adminId).lean();
        if (adminData && adminData != null && adminData.status === true) {
            if (vendorid && vendorid != null && vendorid != undefined && mongoose.Types.ObjectId.isValid(vendorid)) {
                let havepermission = await config.getPermission(adminData.roleid, 'vendors', 'update');
                if (havepermission) {
                    let vendorData = await primary.model(constants.MODELS.vendors, vendorsModel).findById(vendorid).lean();
                    if (vendorData && vendorData != null && vendorData.status === true) {
                        let obj = {
                            owner_photo : owner_photo,
                            owner_name : owner_name,
                            owner_mobile : owner_mobile,
                            owner_email : owner_email,
                            owner_city : owner_city,
                            owner_state : owner_state,
                            company_name : company_name,
                            fleet_size : fleet_size,
                            office_photo : office_photo,
                            visiting_card : visiting_card,
                            business_license : business_license,
                            aadhar_pan : aadhar_pan,
                            gst_certificate : gst_certificate,
                            electricity_bill : electricity_bill,
                            updatedAtTimestamp : Date.now(),
                            updatedBy : new mongoose.Types.ObjectId(req.token.adminId)
                        };
                        await primary.model(constants.MODELS.vendors, vendorsModel).findByIdAndUpdate(vendorid, obj);
                        let updatedVendor = await primary.model(constants.MODELS.vendors, vendorsModel).findById(vendorid).lean();
                        return responseManager.onSuccess('Vendor updated successfully...', updatedVendor, res);
                    } else {
                        return responseManager.badrequest({ message: 'Vendor not found...!' }, res);
                    }
                } else {
                    return responseManager.accessDenied(res);
                }
            } else {
                let havepermission = await config.getPermission(adminData.roleid, 'vendors', 'insert');
                if (havepermission) {
                    let obj = {
                        owner_photo : owner_photo,
                        owner_name : owner_name,
                        owner_mobile : owner_mobile,
                        owner_email : owner_email,
                        owner_city : owner_city,
                        owner_state : owner_state,
                        company_name : company_name,
                        fleet_size : fleet_size,
                        office_photo : office_photo,
                        visiting_card : visiting_card,
                        business_license : business_license,
                        aadhar_pan : aadhar_pan,
                        gst_certificate : gst_certificate,
                        electricity_bill : electricity_bill,
                        createdAtTimestamp : Date.now(),
                        createdBy : new mongoose.Types.ObjectId(req.token.adminId)
                    };
                    await primary.model(constants.MODELS.vendors, vendorsModel).create(obj);
                    let createdVendor = await primary.model(constants.MODELS.vendors, vendorsModel).findOne({ _id : vendorid }).lean();
                    return responseManager.onSuccess('Vendor created successfully...', createdVendor, res);
                } else {
                    return responseManager.accessDenied(res);
                }
            }
        } else {
            return responseManager.accessDenied(res);
        }
    } else {
        return responseManager.unauthorisedRequest(res);
    }
};