const express = require("express");
const PenaltyCtr = require("../../controllers/admins/Master/Panelty/Panelty.controller");
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



router.post("/save", helper.authenticateToken, PenaltyCtr.addPenalty);
router.get("/list", helper.authenticateToken, PenaltyCtr.listPenalty);
router.get("/export",PenaltyCtr.exportPenalties)
router.post("/import",upload.single("file"),PenaltyCtr.importPenalties)
router.get("/:id", helper.authenticateToken, PenaltyCtr.getPenaltyById);
router.delete("/:id", helper.authenticateToken, PenaltyCtr.deletePenalty);
router.put("/:id", helper.authenticateToken, PenaltyCtr.updatePenalty);
router.patch("/:id", helper.authenticateToken, PenaltyCtr.togglePenaltyStatus);

module.exports = router;
