const express = require("express");
const OfferCtr = require("../../controllers/admins/Master/Offers/Offer.controller");
const helper = require("../../utilities/helper")
const multer1 = require("multer");
const multer = require("../../utilities/multer.functions");
const router = express.Router();


const storage = multer1.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // folder jya file save thase
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer1({ storage: storage });

router.post("/save",  helper.authenticateToken, OfferCtr.addOffer);
router.get("/list", helper.authenticateToken, OfferCtr.listOffers);
router.get("/export", OfferCtr.exportOffers)
router.post("/import", upload.single("file"), OfferCtr.importOffers)
router.get("/:id", helper.authenticateToken, OfferCtr.getOfferById);
router.delete("/:id", helper.authenticateToken, OfferCtr.deleteOffer);
router.put("/:id", helper.authenticateToken, OfferCtr.updateOffer);
router.patch("/:id", helper.authenticateToken, OfferCtr.toggleOfferStatus);

module.exports = router;
