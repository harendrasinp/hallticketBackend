const express = require("express");
const router = express.Router();
const Student = require("../models/Students");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/* ===== PRELOAD IMAGES (SPEED BOOST) ===== */
const logo1 = fs.readFileSync(path.join(__dirname, "../logos/tapi.png"));
const logo2 = fs.readFileSync(path.join(__dirname, "../logos/pplogo.png"));
const stamp1 = fs.readFileSync(path.join(__dirname, "../stamps/stampSign.png"));
const stamp2 = fs.readFileSync(path.join(__dirname, "../stamps/stamp1.png"));

router.post("/generate-hallticket", async (req, res) => {
  try {
    let { fullName, mobile } = req.body;

    fullName = fullName.trim().replace(/\s+/g, " ");
    mobile = mobile.trim();

    const student = await Student.findOne({ fullName, mobile });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    /* ===== RESPONSE HEADERS ===== */
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=hallticket_${student.rollNumber}.pdf`
    );

    /* ===== PDF ===== */
    const doc = new PDFDocument({ size: "A4", margin: 40, compress: true });
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const centerX = pageWidth / 2;

    /* ===== BORDER ===== */
    doc.rect(20, 20, 555, 802).stroke();

    /* ===== HEADER ===== */
    const logoSize = 65;
    const textWidth = 360;
    const gap = 20;
    const headerWidth = logoSize + gap + textWidth + gap + logoSize;
    const headerX = centerX - headerWidth / 2;
    const headerY = 45;

    doc.image(logo1, headerX, headerY, { width: logoSize });
    doc.image(logo2, headerX + logoSize + gap + textWidth + gap, headerY, {
      width: logoSize,
    });

    const textX = headerX + logoSize + gap;

    doc.font("Helvetica-Bold").fontSize(20)
      .text("TAPI EDUCATION ACADEMY", textX, headerY, { width: textWidth, align: "center" });

    doc.font("Helvetica-Bold").fontSize(15)
      .text("P.P SAVANI VIDHYAMANDIR", textX, headerY + 26, { width: textWidth, align: "center" });

    doc.font("Helvetica").fontSize(10)
      .text("AT POST KATHGADH VYARA, DIST. TAPI", textX, headerY + 46, { width: textWidth, align: "center" });

    /* ===== TITLE ===== */
    doc.font("Helvetica-Bold").fontSize(18)
      .text("HALL TICKET", 0, 130, { width: pageWidth, align: "center", underline: true });

    /* ===== NAME & SEAT ===== */
    const tableX = centerX - 230;

    doc.font("Helvetica-Bold").fontSize(14)
      .text(`Name: ${student.fullName}`, tableX, 200);

    doc.font("Helvetica-Bold").fontSize(14)
      .text(`Seat No: ${student.rollNumber}`, tableX + 260, 200);

    /* ===== TABLE ===== */
    const rows = [
      ["Std", student.std],
      ["Medium", student.medium],
      ["Center", student.center],
      ["Exam Name", student.examName],
      ["Exam Date", student.examDate],
    ];

    let y = 240;
    rows.forEach(r => {
      doc.font("Helvetica-Bold").text(r[0], tableX, y);
      doc.font("Helvetica").text(String(r[1] ?? "-"), tableX + 120, y);
      y += 30;
    });

    /* ===== STAMPS ===== */
    doc.image(stamp1, tableX, y + 20, { width: 90 });
    doc.image(stamp2, tableX + 280, y + 20, { width: 90 });

    /* ===== FOOTER ===== */
    doc.fontSize(10)
      .text("Note: This hall ticket must be carried to the examination hall.", 0, 740, {
        width: pageWidth,
        align: "center",
      });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
