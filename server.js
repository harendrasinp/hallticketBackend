const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ====== STATIC PDF FOLDER (MOBILE FIX) ====== */
app.use("/halltickets", express.static(path.join(__dirname, "halltickets")));

/* ====== ROUTES ====== */
const hallticketRoute = require("./routes/hallticket");
app.use("/api", hallticketRoute);

const PORT = 5000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
