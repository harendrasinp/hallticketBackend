const mongoose = require("mongoose");
const xlsx = require("xlsx");
const Student = require("./models/Students");

/* ===== MongoDB Connect ===== */
mongoose
  .connect(
    "mongodb+srv://haren111990_db_user:Oug6a7qeZmxGK72E@halltickets.gmyrbmu.mongodb.net/?appName=halltickets"
  )
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

/* ===== Read Excel ===== */
const workbook = xlsx.readFile("students.xlsx");
const sheet = workbook.Sheets[workbook.SheetNames[0]];

/* ===== Convert Sheet to JSON ===== */
const data = xlsx.utils.sheet_to_json(sheet, {
  raw: false,
  defval: "",
});

/* ===== FIX EXCEL DATE HERE ===== */
const fixedData = data.map(row => {
  if (row.examDate && !isNaN(row.examDate)) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + Number(row.examDate) * 86400000);

    row.examDate = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return row;
});

/* ===== INSERT INTO MONGODB ===== */
(async () => {
  try {
    await Student.deleteMany({});
    console.log("Old data deleted");

    /* ⭐⭐ YAHI LINE IMPORTANT HAI ⭐⭐ */
    await Student.insertMany(fixedData);

    console.log("✅ Excel data MongoDB me insert ho gaya");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit();
  }
})();
