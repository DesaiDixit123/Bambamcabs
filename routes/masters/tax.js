const express = require("express");
const taxCtr = require("../../controllers/admins/Master/Tax/tax.controller");
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



router.post("/save", helper.authenticateToken, taxCtr.addTax);
router.get("/list", helper.authenticateToken, taxCtr.listTaxes);
router.get("/export", taxCtr.exportTaxes)
router.post("/import", upload.single("file"), taxCtr.importTaxes)
router.get("/:id", helper.authenticateToken, taxCtr.getTaxById);
router.delete("/:id", helper.authenticateToken, taxCtr.deleteTax);
router.put("/:id", helper.authenticateToken, taxCtr.updateTax);
router.patch("/:id", helper.authenticateToken, taxCtr.toggleTaxStatus);

module.exports = router;
