const express = require("express");
const router = express.Router();
const Student = require("../models/Students");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const hallTicketInstructions = require("../utils/instructions");
const data = require("../utils/data");

/* ===== NAME NORMALIZER ===== */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[\.\s]+/g, " ")
    .trim()
    .split(" ")
    .sort()
    .join(" ");
}

/* ===== AUTO FIT NAME ===== */
function fitText(doc, text, maxWidth, startSize = 14, minSize = 9) {
  let size = startSize;
  doc.fontSize(size);
  while (doc.widthOfString(text) > maxWidth && size > minSize) {
    size--;
    doc.fontSize(size);
  }
  return size;
}

/* ======================================================
   1️⃣ GET STUDENTS BY MOBILE
====================================================== */
router.post("/get-students-by-mobile", async (req, res) => {
  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({ message: "Mobile number required" });
  }

  const students = await Student.find({ mobile: mobile.trim() });

  if (students.length === 0) {
    return res.status(404).json({ message: "Mobile number not found" });
  }

  res.json({
    count: students.length,
    students: students.map(s => ({
      id: s._id,
      fullName: s.fullName
    }))
  });
});

/* ======================================================
   2️⃣ GENERATE HALL TICKET
====================================================== */
router.post("/generate-hallticket", async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ message: "Student ID required" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    /* ===== FOLDER ===== */
    const dir = path.join(__dirname, "../halltickets");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const fileName = `${student.mobile}_${Date.now()}.pdf`;
    const filePath = path.join(dir, fileName);

    /* ===== PDF ===== */
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const centerX = pageWidth / 2;

    doc.rect(20, 20, 555, 802).stroke();

    /* ===== HEADER ===== */
    const logoSize = 65;
    const textWidth = 360;
    const gap = 20;
    const headerWidth = logoSize + gap + textWidth + gap + logoSize;
    const headerX = centerX - headerWidth / 2;

    doc.image(path.join(__dirname, "../logos/tapi.png"), headerX, 45, { width: logoSize });
    doc.image(
      path.join(__dirname, "../logos/pplogo.png"),
      headerX + logoSize + gap + textWidth + gap,
      45,
      { width: logoSize }
    );

    const textX = headerX + logoSize + gap;

    doc.font("Helvetica-Bold").fontSize(20)
      .text(data.tapi, textX, 45, { width: textWidth, align: "center" });

    doc.font("Helvetica-Bold").fontSize(15)
      .text(data.schoolname, textX, 72, { width: textWidth, align: "center" });

    doc.font("Helvetica").fontSize(10)
      .text(data.atpost, textX, 92, { width: textWidth, align: "center" });

    doc.font("Helvetica-Bold").fontSize(18)
      .text(data.hallticket, 0, 135, { width: pageWidth, align: "center", underline: true });

    /* ===== NAME & SEAT ===== */
    const col1 = 200;
    const col2 = 260;
    const tableX = centerX - (col1 + col2) / 2;

    const nameFontSize = fitText(doc, `NAME: ${student.fullName}`, col1);

    doc.font("Helvetica-Bold").fontSize(nameFontSize)
      .text(`NAME: ${student.fullName}`, tableX, 180, { width: col1 });

    doc.font("Helvetica-Bold").fontSize(10)
      .text(`SEAT NO: ${student.rollNumber}`, tableX + col1, 180, { width: col2, align: "right" });

    /* ===== SAVE ===== */
    doc.end();

    stream.on("finish", () => {
      res.json({
        success: true,
        pdfUrl: `/halltickets/${fileName}`
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
