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

    /* ========= FOLDER ========= */
    const dir = path.join(__dirname, "../halltickets");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const fileName = `${mobile}_${Date.now()}.pdf`;
    const filePath = path.join(dir, fileName);

    /* ========= A4 PDF ========= */
    const doc = new PDFDocument({
      size: "A4",          // ✅ A4 fixed
      margin: 40,
    });

    doc.pipe(fs.createWriteStream(filePath));

    /* ========= PAGE BORDER ========= */
    doc.rect(20, 20, 555, 802).stroke();

    const pageWidth = doc.page.width;   // A4 = 595
    const centerX = pageWidth / 2;

    /* ========= HEADER (TRUE CENTER) ========= */
    const logoSize = 65;
    const textWidth = 360;
    const gap = 20;

    const headerWidth = logoSize + gap + textWidth + gap + logoSize;
    const headerX = centerX - headerWidth / 2;
    const headerY = 45;

    // Left Logo
    doc.image(
      path.join(__dirname, "../logos/tapi.png"),
      headerX,
      headerY,
      { width: logoSize }
    );

    // Right Logo
    doc.image(
      path.join(__dirname, "../logos/pplogo.png"),
      headerX + logoSize + gap + textWidth + gap,
      headerY,
      { width: logoSize }
    );

    // Center Text Block
    const textX = headerX + logoSize + gap;

    doc.font("Helvetica-Bold")
      .fontSize(20)
      .text("TAPI EDUCATION ACADEMY", textX, headerY, {
        width: textWidth,
        align: "center",
      });

    doc.font("Helvetica-Bold")
      .fontSize(15)
      .text("P.P SAVANI VIDHYAMANDIR", textX, headerY + 26, {
        width: textWidth,
        align: "center",
      });

    doc.font("Helvetica")
      .fontSize(10)
      .text(
        "AT POST KATHGADH VYARA, DIST. TAPI",
        textX,
        headerY + 46,
        {
          width: textWidth,
          align: "center",
        }
      );

    /* ========= TITLE ========= */
    doc.font("Helvetica-Bold")
      .fontSize(18)
      .text("HALL TICKET", 0, 130, {
        align: "center",
        underline: true,
      });

    /* ========= TABLE (TRUE CENTER) ========= */
    const col1Width = 180;
    const col2Width = 280;
    const tableWidth = col1Width + col2Width;
    const tableX = centerX - tableWidth / 2;
    const tableY = 210;
    const rowHeight = 34;

    const rows = [
      ["Student Name", student.fullName],
      ["Std", student.std],
      ["Medium", student.medium],
      ["Center", student.center],
      ["Exam", student.examName],
      ["Seat No.", student.rollNumber],
      ["Exam Date", student.examDate],
    ];

    // Table outer border
    doc.rect(tableX, tableY, tableWidth, rowHeight * rows.length).stroke();

    rows.forEach((row, i) => {
      const y = tableY + i * rowHeight;

      // Horizontal lines
      if (i > 0) {
        doc.moveTo(tableX, y)
           .lineTo(tableX + tableWidth, y)
           .stroke();
      }

      // Vertical divider
      doc.moveTo(tableX + col1Width, y)
         .lineTo(tableX + col1Width, y + rowHeight)
         .stroke();

      // Label
      doc.font("Helvetica-Bold")
        .fontSize(12)
        .text(row[0], tableX + 10, y + 10, {
          width: col1Width - 20,
          lineBreak: false,
        });

      // Value
      doc.font("Helvetica")
        .fontSize(12)
        .text(String(row[1] ?? "-"), tableX + col1Width + 10, y + 10, {
          width: col2Width - 20,
          lineBreak: false,
        });
    });

    /* ========= FOOTER ========= */
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
