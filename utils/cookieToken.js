const cookieToken = (data, res, statusCode = 200) => {
  const { user } = data;

  const token = user.getJWT();
  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_TIMEOUT * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  user.password = undefined;

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
    data,
  });
};

module.exports = cookieToken;
