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

    /* ================= PAGE BORDER ================= */
    doc.rect(20, 20, 555, 802).stroke();

    const pageWidth = doc.page.width;
    const centerX = pageWidth / 2;

    /* ================= HEADER BLOCK ================= */
    const logoSize = 65;
    const logoGap = 25;
    const headerY = 45;

    // Total header width = logo + gap + text + gap + logo
    const textBlockWidth = 360;
    const headerWidth =
      logoSize + logoGap + textBlockWidth + logoGap + logoSize;

    const headerX = centerX - headerWidth / 2;

    // Left logo
    doc.image(
      path.join(__dirname, "../logos/pplogo.png"),
      headerX,
      headerY,
      { width: logoSize }
    );

    // Right logo
    doc.image(
      path.join(__dirname, "../logos/tapi.png"),
      headerX + logoSize + logoGap + textBlockWidth + logoGap,
      headerY,
      { width: logoSize }
    );

    // Center text block
    const textX = headerX + logoSize + logoGap;

    doc.font("Helvetica-Bold")
      .fontSize(20)
      .text("TAPI EDUCATION ACADEMY", textX, headerY, {
        width: textBlockWidth,
        align: "center",
      });

    doc.font("Helvetica-Bold")
      .fontSize(15)
      .text("P.P SAVANI VIDHYAMANDIR", textX, headerY + 26, {
        width: textBlockWidth,
        align: "center",
      });

    doc.font("Helvetica")
      .fontSize(10)
      .text(
        "AT POST KATHGADH VYARA, DIST. TAPI",
        textX,
        headerY + 46,
        {
          width: textBlockWidth,
          align: "center",
        }
      );

    /* ================= TITLE ================= */
    doc.font("Helvetica-Bold")
      .fontSize(18)
      .text("HALL TICKET", 0, 125, {
        align: "center",
        underline: true,
      });

    /* ================= TABLE ================= */
    const col1Width = 180;
    const col2Width = 280;
    const tableWidth = col1Width + col2Width;
    const tableX = centerX - tableWidth / 2;
    const tableY = 200;
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

    // Outer border
    doc.rect(tableX, tableY, tableWidth, rowHeight * rows.length).stroke();

    rows.forEach((row, i) => {
      const y = tableY + i * rowHeight;

      if (i > 0) {
        doc.moveTo(tableX, y)
           .lineTo(tableX + tableWidth, y)
           .stroke();
      }

      doc.moveTo(tableX + col1Width, y)
         .lineTo(tableX + col1Width, y + rowHeight)
         .stroke();

      doc.font("Helvetica-Bold")
        .fontSize(12)
        .text(row[0], tableX + 10, y + 10, {
          width: col1Width - 20,
          lineBreak: false,
        });

      doc.font("Helvetica")
        .fontSize(12)
        .text(String(row[1] ?? "-"), tableX + col1Width + 10, y + 10, {
          width: col2Width - 20,
          lineBreak: false,
        });
    });

    /* ================= FOOTER ================= */
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
