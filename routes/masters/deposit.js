const express = require("express");
const DepositCtr = require("../../controllers/admins/Master/Deposit/deposit.controller");
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



router.post("/save", helper.authenticateToken, DepositCtr.addDeposit);
router.get("/list", helper.authenticateToken, DepositCtr.listDeposits);
router.get("/export",DepositCtr.exportDeposits)
router.post("/import",upload.single("file"),DepositCtr.importDeposits)
router.get("/:id", helper.authenticateToken, DepositCtr.getDepositById);
router.delete("/:id", helper.authenticateToken, DepositCtr.deleteDeposit);
router.put("/:id", helper.authenticateToken, DepositCtr.updateDeposit);
router.patch("/:id", helper.authenticateToken, DepositCtr.toggleDepositStatus);

module.exports = router;
