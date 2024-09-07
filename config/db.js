const mongoose = require("mongoose");

const connect = () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("Successfully connected to DB");
    })
    .catch((err) => {
      console.log("Error connecting to DB");
      console.error(err);
      process.exit(1);
    });
};

module.exports = {
  connect,
};
