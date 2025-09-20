const express = require("express");
const PaymentCtr = require("../../controllers/admins/Master/Payment/Payment.controller");
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



router.post("/save", helper.authenticateToken, PaymentCtr.addPayment);
router.get("/list", helper.authenticateToken, PaymentCtr.listPayments);
router.get("/export", PaymentCtr.exportPayments)
router.post("/import", upload.single("file"), PaymentCtr.importPayments)
router.get("/:id", helper.authenticateToken, PaymentCtr.getPaymentById);
router.delete("/:id", helper.authenticateToken, PaymentCtr.deletePayment);
router.put("/:id", helper.authenticateToken, PaymentCtr.updatePayment);
router.patch("/:id", helper.authenticateToken, PaymentCtr.togglePaymentStatus);

module.exports = router;
