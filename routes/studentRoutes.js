const express = require("express");
const router = express.Router();
const Student = require("../models/Students");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

router.post("/generate-hallticket", async (req, res) => {
  try {
    const { fullName, mobile } = req.body;

    const student = await Student.findOne({ fullName, mobile });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    /* ===== Folder auto create ===== */
    const dir = path.join(__dirname, "../halltickets");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const fileName = `${mobile}.pdf`;
    const filePath = path.join(dir, fileName);

    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
    });

    doc.pipe(fs.createWriteStream(filePath));

    /* ===== Border ===== */
    doc.rect(20, 20, 555, 802).stroke();

    /* ===== LOGOS ===== */
    const logoLeft = path.join(__dirname, "../logos/pplogo.png");
    const logoRight = path.join(__dirname, "../logos/tapi.png");

    doc.image(logoLeft, 40, 35, { width: 70 });
    doc.image(logoRight, 465, 35, { width: 70 });

    /* ===== ACADEMY NAME ===== */
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("TAPI EDUCATION ACADEMY", 0, 60, {
        align: "center",
      });

    doc.moveDown(2);

    /* ===== HALL TICKET TITLE ===== */
    doc
      .fontSize(18)
      .text("HALL TICKET", {
        align: "center",
        underline: true,
      });

    doc.moveDown(2);

    /* ===== STUDENT DETAILS ===== */
    let y = 220;
    const labelX = 100;
    const valueX = 260;
    const gap = 28;
    const labelWidth = 140;
    const valueWidth = 260;

    // LABELS
    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("Student Name :", labelX, y, { width: labelWidth });
    doc.text("Std :", labelX, y += gap, { width: labelWidth });
    doc.text("Medium :", labelX, y += gap, { width: labelWidth });
    doc.text("Center :", labelX, y += gap, { width: labelWidth });
    doc.text("Exam :", labelX, y += gap, { width: labelWidth });
    doc.text("Seat No. :", labelX, y += gap, { width: labelWidth });
    doc.text("Exam Date :", labelX, y += gap, { width: labelWidth });

    // VALUES
    y = 220;
    doc.font("Helvetica");
    doc.text(student.fullName, valueX, y, { width: valueWidth });
    doc.text(student.std, valueX, y += gap, { width: valueWidth });
    doc.text(student.medium, valueX, y += gap, { width: valueWidth });
    doc.text(student.center, valueX, y += gap, { width: valueWidth });
    doc.text(student.examName, valueX, y += gap, { width: valueWidth });
    doc.text(student.rollNumber, valueX, y += gap, { width: valueWidth });
    doc.text(student.examDate, valueX, y += gap, { width: valueWidth });

    /* ===== FOOTER ===== */
    doc
      .fontSize(10)
      .text(
        "Note: This hall ticket must be carried to the examination hall.",
        0,
        740,
        { align: "center" }
      );

    doc.end();

    res.json({
      success: true,
      pdfUrl: `/halltickets/${fileName}`,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
