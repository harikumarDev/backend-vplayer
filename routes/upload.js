const express = require("express");
const multer = require("multer");
const Upload = require("../controllers/upload");

const router = express.Router();
const multerUpload = multer();

router.route("/video").post(multerUpload.single("file"), Upload.video);
router.route("/initialize").get(Upload.initializeMultipart);
router.route("/chunk").put(multerUpload.single("file"), Upload.chunk);
router.route("/complete").post(Upload.completeMultipart);
router.route("/abort").delete(Upload.abortMultipart);

module.exports = router;
