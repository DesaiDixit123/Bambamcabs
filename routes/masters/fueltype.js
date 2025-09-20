const express = require("express");
const FuelTypeCtr = require("../../controllers/admins/Master/fuel_types/fueltype");
const helper=require("../../utilities/helper")
const multer = require("multer");
const router = express.Router();


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // folder jya file save thase
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage: storage });



router.post("/save", helper.authenticateToken, FuelTypeCtr.addFuelType);
router.get("/list", helper.authenticateToken, FuelTypeCtr.listFuelTypes);
router.get("/export",FuelTypeCtr.exportFuelTypes)
router.post("/import",upload.single("file"),FuelTypeCtr.importFuelTypes)
router.get("/:id", helper.authenticateToken, FuelTypeCtr.getFuelTypeById);
router.delete("/:id", helper.authenticateToken, FuelTypeCtr.deleteFuelType);
router.put("/:id", helper.authenticateToken, FuelTypeCtr.updateFuelType);
router.patch("/:id", helper.authenticateToken, FuelTypeCtr.toggleFuelTypeStatus);

module.exports = router;
