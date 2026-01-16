const express = require("express");
const router = express.Router();
const Student = require("../models/Students");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

router.post("/generate-hallticket", async (req, res) => {
  try {
    let { fullName, mobile } = req.body;

    /* ===== CLEAN INPUT ===== */
    const inputName = fullName.trim().replace(/\s+/g, " ");
    mobile = mobile.trim();

    /* ===== FIND ONLY BY MOBILE ===== */
    const student = await Student.findOne({ mobile });
    if (!student) {
      return res.status(404).json({ message: "Mobile number not found" });
    }

    /* ===== FOLDER ===== */
    const dir = path.join(__dirname, "../halltickets");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const fileName = `${mobile}_${Date.now()}.pdf`;
    const filePath = path.join(dir, fileName);

    /* ===== PDF ===== */
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

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

    doc.image(path.join(__dirname, "../logos/tapi.png"), headerX, headerY, { width: logoSize });
    doc.image(
      path.join(__dirname, "../logos/pplogo.png"),
      headerX + logoSize + gap + textWidth + gap,
      headerY,
      { width: logoSize }
    );

    const textX = headerX + logoSize + gap;

    doc.font("Helvetica-Bold").fontSize(20)
      .text("TAPI EDUCATION ACADEMY", textX, headerY, { width: textWidth, align: "center" });

    doc.font("Helvetica-Bold").fontSize(15)
      .text("P.P SAVANI VIDHYAMANDIR", textX, headerY + 26, { width: textWidth, align: "center" });

    doc.font("Helvetica").fontSize(10)
      .text("AT POST KATHGADH VYARA, DIST. TAPI", textX, headerY + 46, { width: textWidth, align: "center" });

    /* ===== TITLE ===== */
    doc.font("Helvetica-Bold").fontSize(18)
      .text("HALL TICKET", 0, 130, {
        width: pageWidth,
        align: "center",
        underline: true
      });

    /* ===== NAME & SEAT (FIXED SINGLE LINE) ===== */
    const col1Width = 260; // name ko zyada space
    const col2Width = 200;
    const tableWidth = col1Width + col2Width;
    const tableX = centerX - tableWidth / 2;
    const lineY = 200;

    /* 👉 NAME (ALWAYS ONE LINE) */
    doc.font("Helvetica-Bold").fontSize(14)
      .text(`NAME: ${inputName}`, tableX, lineY, {
        width: col1Width,
        height: 18,
        lineBreak: false,
        ellipsis: true
      });

    /* 👉 SEAT NO */
    doc.font("Helvetica-Bold").fontSize(14)
      .text(`SEAT NO: ${student.rollNumber}`, tableX + col1Width, lineY, {
        width: col2Width,
        align: "right",
        lineBreak: false
      });

    /* ===== TABLE ===== */
    const tableY = lineY + 30;
    const rowHeight = 34;

    const rows = [
      ["Std", student.std],
      ["Medium", student.medium],
      ["Center", student.center],
      ["Exam Name", student.examName],
      ["Exam Date", student.examDate],
    ];

    doc.rect(tableX, tableY, tableWidth, rowHeight * rows.length).stroke();

    rows.forEach((row, i) => {
      const y = tableY + i * rowHeight;

      if (i > 0) doc.moveTo(tableX, y).lineTo(tableX + tableWidth, y).stroke();
      doc.moveTo(tableX + col1Width, y).lineTo(tableX + col1Width, y + rowHeight).stroke();

      doc.font("Helvetica-Bold").fontSize(12)
        .text(row[0], tableX + 10, y + 10, { width: col1Width - 20 });

      doc.font("Helvetica").fontSize(12)
        .text(String(row[1] ?? "-"), tableX + col1Width + 10, y + 10, { width: col2Width - 20 });
    });

    /* ===== STAMPS ===== */
    const stampY = tableY + rowHeight * rows.length + 30;
    const stampWidth = 90;

    doc.image(path.join(__dirname, "../stamps/stampSign.png"), tableX, stampY, { width: stampWidth });
    doc.image(path.join(__dirname, "../stamps/stamp1.png"), tableX + tableWidth - stampWidth, stampY, { width: stampWidth });

    /* ===== FOOTER ===== */
    doc.fontSize(10)
      .text(
        "Note: This hall ticket must be carried to the examination hall.",
        0,
        740,
        { width: pageWidth, align: "center" }
      );

    doc.end();

    stream.on("finish", () => {
      res.json({
        success: true,
        pdfUrl: `/halltickets/${fileName}`,
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
