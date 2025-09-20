const express = require("express");
const VehicleTypes = require("../../controllers/admins/Master/vehicale_types/vehicle_types");
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


router.post("/save",helper.authenticateToken, VehicleTypes.addVehicleType);
router.post("/add",helper.authenticateToken, VehicleTypes.simpleAddVehicleType);
router.post("/add/update/type",helper.authenticateToken, VehicleTypes.addOrUpdateVehicleTypeState);
router.delete("/city",helper.authenticateToken, VehicleTypes.deleteVehicleTypeCity);
router.get("/state/:vehicleTypeId", helper.authenticateToken, VehicleTypes.getVehicleTypeStateById);

router.post("/import",upload.single("file"), VehicleTypes.importVehicleTypes);
router.get("/list", helper.authenticateToken, VehicleTypes.listVehicleTypes);
router.get("/state/type/:stateId", helper.authenticateToken, VehicleTypes.getVehicleTypeStateByStateId);
router.post("/type/city", helper.authenticateToken, VehicleTypes.getVehicleTypeCities);
router.get("/export",VehicleTypes.exportVehicleTypes);
router.get("/:id",helper.authenticateToken, VehicleTypes.getVehicleTypeById);
router.put("/:id",helper.authenticateToken, VehicleTypes.updateVehicleType);
router.put("/update/vehicle/type/city",helper.authenticateToken, VehicleTypes.updateVehicleTypeCity);
router.delete("/:id",helper.authenticateToken, VehicleTypes.deleteVehicleType);
router.patch("/:id/toggle",helper.authenticateToken,VehicleTypes.toggleVehicleTypeStatus);


module.exports = router;
