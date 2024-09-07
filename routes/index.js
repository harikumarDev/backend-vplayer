const express = require("express");
const auth = require("./auth");
const upload = require("./upload");
const video = require("./video");
const authCheck = require("../middlewares/auth");

const router = express.Router();

router.use("/auth", auth);
router.use("/upload", authCheck.isLoggedIn, upload);
router.use("/videos", video);

module.exports = router;
