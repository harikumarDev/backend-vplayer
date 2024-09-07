const app = require("./app");
const db = require("./config/db");
const routes = require("./routes");

const PORT = process.env.PORT || 5000;

// Handle Uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log(`ERROR (Uncaught exception): ${err.stack}`);
});

db.connect();

app.use("/api/v1", routes);

const server = app.listen(PORT, () => {
  console.log(
    `Server running at http://localhost:${process.env.PORT} in ${process.env.NODE_ENV} mode`
  );
});

// Handle Unhandled Promise rejections
process.on("unhandledRejection", (err) => {
  console.log(`ERROR (Unhandled Promise rejection): ${err.stack}`);
});
