const express = require("express");
const Video = require("../controllers/video");
const authCheck = require("../middlewares/auth");

const router = express.Router();

router.route("/").get(Video.getAll);
router
  .route("/:id")
  .get(Video.getById)
  .patch(authCheck.isLoggedIn, Video.edit)
  .delete(authCheck.isLoggedIn, Video.delete);
router.route("/user/:id").get(authCheck.isLoggedIn, Video.uploaded);

module.exports = router;
