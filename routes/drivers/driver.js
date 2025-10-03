const express = require("express");
const router = express.Router();
const helper = require("../../utilities/helper");
const multer = require("../../utilities/multer.functions");
const { addDriver, driverLogin } = require("../../controllers/Drivers/drivers.controller");


router.post(
  "/save",
  multer.memoryUpload.fields([
    { name: "driver_photo", maxCount: 1 },
    { name: "DL_photo", maxCount: 1 },
  ]),
  addDriver
);


router.post("/login",driverLogin)


module.exports = router;
