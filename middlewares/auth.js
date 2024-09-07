const jwt = require("jsonwebtoken");
const User = require("../models/user");
const catchAsyncErrors = require("./catchAsyncErrors");
const error = require("../utils/error.js");

const isLoggedIn = catchAsyncErrors(async (req, res, next) => {
  const token =
    req.header("Authorization")?.replace("Bearer ", "") ||
    req.body.token ||
    req.cookies.token;

  if (!token) {
    return error(res, next, "Login to access this page", 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return error(res, next, "User not found", 401);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.message === "jwt expired") {
      return error(res, next, "Session expired", 401);
    }

    return error(res, next, "Something went wrong with token", 401);
  }
});

module.exports = {
  isLoggedIn,
};
