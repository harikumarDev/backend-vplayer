class CustomError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const returnError = (res, next, message, code = 400) => {
  res.status(code).json({
    success: false,
    message,
  });
  return next(new CustomError(message, code));
};

module.exports = returnError;
