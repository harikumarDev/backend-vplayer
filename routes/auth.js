const express = require("express");
const authCheck = require("../middlewares/auth");
const Auth = require("../controllers/auth");

const router = express.Router();

router.route("/login").post(Auth.login);
router.route("/signup").post(Auth.signup);
router.route("/logout").get(authCheck.isLoggedIn, Auth.logout);
router.route("/me").get(authCheck.isLoggedIn, Auth.me);

module.exports = router;
