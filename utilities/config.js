const _ = require("lodash");
const constants = require('./constants');
const mongoConnection = require('./connections');
var roleModel = require('../models/roles.model');

let adminCollections = [
    { text: 'Admins', value: 'admins' },
    { text: 'Role & Permissions', value: 'roles' },
    { text: 'Telephone Directory', value: 'telephonedirectories' },
    { text: 'Club Members', value: 'primarymembers' },
    { text: 'Club Inquiry', value: 'clubinquiries' },
    { text: 'Booking Inquiry', value: 'bookinginquiries' },
    { text: 'Event Inquiry', value: 'eventinquiries' },
    { text: 'Announcements', value: 'announcements' },
    { text: 'Room Amenities', value: 'roomamenities' },
    { text: 'Club Amenities', value: 'clubamenities' },
    { text: 'Booking Categories', value: 'bookingcategories' },
    { text: 'Brokers', value: 'brokers' },
    { text: 'Personal Trainers', value: 'personaltrainers' },
    { text: 'Room Numbers', value: 'roomnumbers' },
    { text: 'GYM & Swimming Members', value: 'gymmembers' },
    { text: 'Event Managements', value: 'eventmanagements' },
    { text: 'Room Bookings', value: 'roombookings' },
    { text: 'Amenities Bookings', value: 'amenitiesbookings' },
    { text: 'Member Recharges', value: 'topuprecharges' },
    { text: 'Gallery Medias', value: 'gallerymedias' },
    { text: 'Home Medias', value: 'homemedias' },
    { text: 'Rooms', value: 'rooms' },
    { text: 'Amenities Services', value: 'amenitiesservices' },
    { text: 'Amenities Categories', value: 'amenitycategories' },
    { text: 'Users', value: 'users' },
    { text: 'Open Positions', value: 'openpositions' },
    { text: 'Applied Positions', value: 'appliedpositions' },
    { text: 'AMC Settings', value: 'amcsettings' },
    { text: 'Member AMC', value: 'memberamcs' },
    { text: 'Drivers', value: 'drivers' } ,  // 👈 drivers add
     { text: 'Vehicle', value: 'vehiclestypes' }
];

async function getPermission(roleID, modelName, permissionType) {
    let primary = mongoConnection.useDb(constants.DEFAULT_DB);
    let result = await primary.model(constants.MODELS.roles, roleModel).findById(roleID).lean();
    if (result && result.status && result.status == true) {
        let finalpermission = _.filter(result.permissions, { 'collectionName': modelName });
        if (finalpermission.length === 1) {
            let perm = finalpermission[0];
            if (permissionType === "view") return perm.view === true;
            if (permissionType === "insert") return perm.insert === true;
            if (permissionType === "update") return perm.update === true;
            if (permissionType === "delete") return perm.delete === true;
            return false;
        } else {
            return false;
        }
    } else {
        return false;
    }
};

module.exports = { getPermission, adminCollections };
