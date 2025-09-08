const express = require('express');
const router = express.Router();
const helper = require('../../utilities/helper');
const multer = require('../../utilities/multer.functions');
const saveadminuserCtrl = require('../../controllers/admins/adminusers/save');
const adminuserlistCtrl = require('../../controllers/admins/adminusers/list');
const getoneadminuserCtrl = require('../../controllers/admins/adminusers/getone');
const changeadminuserStatus = require('../../controllers/admins/adminusers/changestatus');
const getadminprofiledetailsCtrl = require('../../controllers/admins/adminusers/getprofiledetails');
const editadminprofiledetailsCtrl = require('../../controllers/admins/adminusers/editprofile');

router.post('/save', saveadminuserCtrl.saveadminuser);
router.post('/', helper.authenticateToken, adminuserlistCtrl.withoutpagination);
router.post('/list', helper.authenticateToken, adminuserlistCtrl.withpagination);
router.post('/getone', helper.authenticateToken, getoneadminuserCtrl.getoneadminuser);
router.post('/change', helper.authenticateToken, changeadminuserStatus.changestatus);
router.get('/getprofile', helper.authenticateToken, getadminprofiledetailsCtrl.getadminprofile);
router.post('/editprofile', helper.authenticateToken, multer.memoryUpload.single('profile'), editadminprofiledetailsCtrl.editprofile);

module.exports = router;