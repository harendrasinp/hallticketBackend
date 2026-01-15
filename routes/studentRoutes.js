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

    // ===== FOLDER =====
    const dir = path.join(__dirname, "../halltickets");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    // ⚠️ cache avoid for mobile
    const fileName = `${mobile}_${Date.now()}.pdf`;
    const filePath = path.join(dir, fileName);

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(fs.createWriteStream(filePath));

    // ===== BORDER =====
    doc.rect(20, 20, 555, 802).stroke();

    // ===== LOGOS =====
    doc.image(path.join(__dirname, "../logos/pplogo.png"), 40, 35, { width: 70 });
    doc.image(path.join(__dirname, "../logos/tapi.png"), 465, 35, { width: 70 });

    // ===== TITLE =====
    doc.font("Helvetica-Bold").fontSize(20)
      .text("TAPI EDUCATION ACADEMY", 0, 60, { align: "center" });

    doc.moveDown(2);
    doc.fontSize(18).text("HALL TICKET", { align: "center", underline: true });

    // ===== STUDENT DETAILS (MOBILE SAFE) =====
    let y = 220;
    const labelX = 100;
    const valueX = 260;
    const gap = 28;

    const drawRow = (label, value) => {
      doc.font("Helvetica-Bold")
        .fontSize(12)
        .text(label, labelX, y, { width: 140, lineBreak: false });

      doc.font("Helvetica")
        .fontSize(12)
        .text(String(value ?? "-"), valueX, y, {
          width: 260,
          lineBreak: false
        });

      y += gap;
    };

    drawRow("Student Name :", student.fullName);
    drawRow("Std :", student.std);
    drawRow("Medium :", student.medium);
    drawRow("Center :", student.center);
    drawRow("Exam :", student.examName);
    drawRow("Seat No. :", student.rollNumber);
    drawRow("Exam Date :", student.examDate);

    // ===== FOOTER =====
    doc.fontSize(10)
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
