const express = require("express");
const router = express.Router();
const helper = require("../../utilities/helper");
const multer = require("../../utilities/multer.functions");
const { addDriver } = require("../../controllers/admins/drivers/adddrivers");


router.post(
  "/save",
  multer.memoryUpload.fields([
    { name: "driver_photo", maxCount: 1 },
    { name: "DL_photo", maxCount: 1 },
  ]),
  addDriver
);


module.exports = router;
