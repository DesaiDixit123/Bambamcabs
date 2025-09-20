const express = require("express");
const LanguageCtr = require("../../controllers/admins/Master/languages/languages.controller");
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



router.post("/save", helper.authenticateToken, LanguageCtr.addLanguage);
router.get("/list", helper.authenticateToken, LanguageCtr.listLanguages);
router.get("/export",LanguageCtr.exportLanguages)
router.post("/import",upload.single("file"),LanguageCtr.importLanguages)
router.get("/:id", helper.authenticateToken, LanguageCtr.getLanguageById);
router.delete("/:id", helper.authenticateToken, LanguageCtr.deleteLangauge);
router.put("/:id", helper.authenticateToken, LanguageCtr.updateLanguage);
router.patch("/:id", helper.authenticateToken, LanguageCtr.toggleLanguageStatus);

module.exports = router;
