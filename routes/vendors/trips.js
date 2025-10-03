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
router.get("/oneway/export",TripsController.exportOnewayTrips)
router.get("/get-oneway/:id",helper.authenticateToken,TripsController.getOnewayTripById)
router.put("/update-oneway/:id",helper.authenticateToken,TripsController.OnewayUpdateTrip)
router.delete("/oneway/trip/:id",helper.authenticateToken,TripsController.deleteOnewayTrip)
router.post("/toggle/oneway/trip/:id",helper.authenticateToken,TripsController.toggleOnewayTripStatus)
router.post("/oneway/import",upload.single("file"),TripsController.importOnewayTrips)


router.get("/get-roundtrip-list",helper.authenticateToken,TripsController.getRoundTrips)
router.get("/roundtrip/export",TripsController.exportRoundTrips)
router.get("/get-roundtrip/:id",helper.authenticateToken,TripsController.getRoundTripById)
router.put("/update-roundtrip/:id",helper.authenticateToken,TripsController.RoundTripUpdateTrip)
router.delete("/round/trip/:id",helper.authenticateToken,TripsController.deleteRoundTrip)
router.post("/toggle/round/trip/:id",helper.authenticateToken,TripsController.toggleRoundTripStatus)
router.post("/roundtrip/import", upload.single("file"), TripsController.importRoundTrips)



router.get("/get-localrental-list",helper.authenticateToken,TripsController.getLocalRentalTrips)
router.get("/localrental/export",TripsController.exportLocalRentalTrips)
router.get("/get-localrental/:id",helper.authenticateToken,TripsController.getLocalRentalTripById)
router.put("/update-localrental/:id",helper.authenticateToken,TripsController.LocalRentalUpdateTrip)
router.delete("/localrental/trip/:id",helper.authenticateToken,TripsController.deleteLocalRentalTrip)
router.post("/toggle/localrental/trip/:id",helper.authenticateToken,TripsController.toggleLocalRentalTripStatus)
router.post("/localrental/import",upload.single("file"),TripsController.importLocalRentalTrips)


module.exports = router;
