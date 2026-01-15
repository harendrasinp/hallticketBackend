const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const studentRoutes = require("./routes/studentRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// static pdf access
app.use("/halltickets", express.static(path.join(__dirname, "halltickets")));

mongoose.connect(
  "mongodb+srv://haren111990_db_user:Oug6a7qeZmxGK72E@halltickets.gmyrbmu.mongodb.net/?appName=halltickets"
).then(() => console.log("MongoDB Connected"))
 .catch(err => console.log(err));

app.use("/api/students", studentRoutes);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
