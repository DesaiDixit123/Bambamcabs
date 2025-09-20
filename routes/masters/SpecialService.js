const express = require("express");
const SpecialServiceCtr = require("../../controllers/admins/Master/Special_Services/SpecialServices.controller");
const helper = require("../../utilities/helper")
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



router.post("/save", helper.authenticateToken, SpecialServiceCtr.addSpecialService);
router.get("/list", helper.authenticateToken, SpecialServiceCtr.listSpecialServices);
router.get("/export", SpecialServiceCtr.exportSpecialServices)
router.post("/import", upload.single("file"), SpecialServiceCtr.importSpecialServices)
router.get("/:id", helper.authenticateToken, SpecialServiceCtr.getSpecialServiceById);
router.delete("/:id", helper.authenticateToken, SpecialServiceCtr.deleteSpecialService);
router.put("/:id", helper.authenticateToken, SpecialServiceCtr.updateSpecialService);
router.patch("/:id", helper.authenticateToken, SpecialServiceCtr.toggleSpecialServiceStatus);

module.exports = router;
