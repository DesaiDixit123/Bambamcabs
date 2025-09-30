const express = require("express");
const router = express.Router();
const helper = require("../../utilities/helper");
const multer1 = require("multer");
const multer = require("../../utilities/multer.functions");
const TripsController = require("../../controllers/Trips/trips.controller");


const storage = multer1.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // folder jya file save thase
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer1({ storage: storage });

router.post(
    "/save",
    helper.authenticateToken,
  TripsController.createTrip
);
router.post(
    "/local-rent/save",
    helper.authenticateToken,
  TripsController.createLocalRentalTrip
);

router.get("/get-oneway-list",helper.authenticateToken,TripsController.getOnewayTrips)
router.get("/oneway/export",TripsController.exportTrips)
router.get("/get-oneway/:id",helper.authenticateToken,TripsController.getOnewayTripById)
router.put("/update-oneway/:id",helper.authenticateToken,TripsController.OnewayUpdateTrip)
router.delete("/oneway/trip/:id",helper.authenticateToken,TripsController.deleteOnewayTrip)
router.post("/toggle/oneway/trip/:id",helper.authenticateToken,TripsController.toggleOnewayTripStatus)
router.post("/oneway/import",upload.single("file"),TripsController.importTrips)



module.exports = router;
