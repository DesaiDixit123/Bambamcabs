const express = require("express");
const InvoiceCtr = require("../../controllers/admins/Master/Invoice/Invoice.controller");
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



router.post("/save", multer.memoryUpload.fields([
    { name: "logo", maxCount: 1 },

]), helper.authenticateToken, InvoiceCtr.addInvoice);
router.get("/list", helper.authenticateToken, InvoiceCtr.listInvoices);
router.get("/export", InvoiceCtr.exportInvoices)
router.post("/import", upload.single("file"), InvoiceCtr.importInvoices)
router.get("/:id", helper.authenticateToken, InvoiceCtr.getInvoiceById);
router.delete("/:id", helper.authenticateToken, InvoiceCtr.deleteInvoice);
router.put("/:id", multer.memoryUpload.fields([
    { name: "logo", maxCount: 1 },

]), helper.authenticateToken, InvoiceCtr.updateInvoice);
router.patch("/:id", helper.authenticateToken, InvoiceCtr.toggleInvoiceStatus);

module.exports = router;
