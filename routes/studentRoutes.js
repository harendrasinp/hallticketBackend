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

    const fileName = `${mobile}_${Date.now()}.pdf`;
    const filePath = path.join(dir, fileName);

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(fs.createWriteStream(filePath));

    // ===== PAGE BORDER =====
    doc.rect(20, 20, 555, 802).stroke();

    // ===== LOGOS =====
    doc.image(path.join(__dirname, "../logos/pplogo.png"), 40, 35, { width: 70 });
    doc.image(path.join(__dirname, "../logos/tapi.png"), 465, 35, { width: 70 });

    // ===== TITLE =====
    doc.font("Helvetica-Bold")
      .fontSize(20)
      .text("TAPI EDUCATION ACADEMY", 0, 60, { align: "center" });

    doc.moveDown(2);
    doc.fontSize(18).text("HALL TICKET", { align: "center", underline: true });

    // ===== TABLE CONFIG =====
    const tableX = 80;
    const tableY = 220;
    const rowHeight = 32;
    const col1Width = 180;
    const col2Width = 280;
    const tableWidth = col1Width + col2Width;

    const rows = [
      ["Student Name", student.fullName],
      ["Std", student.std],
      ["Medium", student.medium],
      ["Center", student.center],
      ["Exam", student.examName],
      ["Seat No.", student.rollNumber],
      ["Exam Date", student.examDate],
    ];

    // ===== TABLE BORDER =====
    doc.rect(tableX, tableY, tableWidth, rowHeight * rows.length).stroke();

    // ===== ROWS =====
    rows.forEach((row, index) => {
      const y = tableY + index * rowHeight;

      // Horizontal line
      if (index > 0) {
        doc
          .moveTo(tableX, y)
          .lineTo(tableX + tableWidth, y)
          .stroke();
      }

      // Vertical line (column separator)
      doc
        .moveTo(tableX + col1Width, y)
        .lineTo(tableX + col1Width, y + rowHeight)
        .stroke();

      // LABEL
      doc.font("Helvetica-Bold")
        .fontSize(12)
        .text(row[0], tableX + 10, y + 9, {
          width: col1Width - 20,
          lineBreak: false,
        });

      // VALUE
      doc.font("Helvetica")
        .fontSize(12)
        .text(String(row[1] ?? "-"), tableX + col1Width + 10, y + 9, {
          width: col2Width - 20,
          lineBreak: false,
        });
    });

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
