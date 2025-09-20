const express = require("express");
const BlogCtr = require("../../controllers/admins/Master/Blog/blog.controller");
const helper = require("../../utilities/helper");
const multer1 = require("multer");
const multer = require("../../utilities/multer.functions");
const router = express.Router();

const storage = multer1.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer1({ storage: storage });

router.post(
    "/save",
    multer.memoryUpload.fields([{ name: "media", maxCount: 1 }]),
    helper.authenticateToken,
    BlogCtr.addBlog
);

router.get("/list", helper.authenticateToken, BlogCtr.listBlogs);
router.get("/export", BlogCtr.exportBlogs);
router.post("/import", upload.single("file"), BlogCtr.importBlogs);
router.get("/:id", helper.authenticateToken, BlogCtr.getBlogById);
router.delete("/:id", helper.authenticateToken, BlogCtr.deleteBlog);
router.put(
    "/:blogId",
    multer.memoryUpload.fields([{ name: "media", maxCount: 1 }]),
    helper.authenticateToken,
    BlogCtr.updateBlog
);
router.patch("/:id", helper.authenticateToken, BlogCtr.toggleBlogStatus);

module.exports = router;
