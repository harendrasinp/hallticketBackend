const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const studentRoutes = require("./routes/studentRoutes"); // hallticket route

const app = express();

/* ===== MIDDLEWARE ===== */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // important for mobile/form-data

/* ===== STATIC PDF FOLDER ===== */
app.use("/halltickets", express.static(path.join(__dirname, "halltickets")));

/* ===== MONGODB CONNECT ===== */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

/* ===== ROUTES ===== */
app.use("/api/students", studentRoutes);

/* ===== SERVER ===== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
