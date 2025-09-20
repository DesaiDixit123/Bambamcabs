const express = require("express");
const PrivacyPolicyCtr = require("../../controllers/admins/Master/Privacy_Policy/PrivacyPolicy.controller");
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



router.post("/save", helper.authenticateToken, PrivacyPolicyCtr.addPolicy);
router.get("/list", helper.authenticateToken, PrivacyPolicyCtr.listPolicies);
router.get("/export", PrivacyPolicyCtr.exportPolicies)
router.post("/import", upload.single("file"), PrivacyPolicyCtr.importPolicies)
router.get("/:id", helper.authenticateToken, PrivacyPolicyCtr.getPolicyById);
router.delete("/:id", helper.authenticateToken, PrivacyPolicyCtr.deletePolicy);
router.put("/:id", helper.authenticateToken, PrivacyPolicyCtr.updatePolicy);
router.patch("/:id", helper.authenticateToken, PrivacyPolicyCtr.togglePolicyStatus);

module.exports = router;
