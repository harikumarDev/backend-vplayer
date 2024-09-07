const User = require("../models/user");
const cookieToken = require("../utils/cookieToken");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const error = require("../utils/error");

const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;
  console.log("Login from :: ", email);

  if (!(email && password)) {
    return error(res, next, "Email and password are required");
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return error(res, next, "Invalid credentials", 401);
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return error(res, next, "Invalid credentials", 401);
  }

  let data = {
    user,
  };

  cookieToken(data, res);
});

const signup = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password } = req.body;
  console.log("Signup from :: ", email);

  if (!(email && password && name)) {
    return error(res, next, "All inputs are required");
  }

  if (password.length < 8) {
    return error(res, next, "Password should be at least 8 characters");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return error(res, next, "You're already registered with this Email");
  }

  delete req.body.password;

  const user = await User.create({
    name,
    email,
    password,
  });

  let data = {
    user,
  };

  cookieToken(data, res, 201);
});

const logout = catchAsyncErrors(async (req, res, next) => {
  console.log("Logout: ", req.user.email);

  res
    .status(200)
    .cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .json({
      success: true,
    });
});

const me = catchAsyncErrors(async (req, res, next) => {
  respJson(res, 200, { user: req.user });
});

module.exports = {
  login,
  signup,
  logout,
  me,
};
