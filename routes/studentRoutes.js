const express = require("express");
const router = express.Router();
const Student = require("../models/Students");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const hallTicketInstructions = require("../utils/instructions");

/* ===== PRELOAD IMAGES (VERY IMPORTANT FOR SPEED) ===== */
const tapiLogo = fs.readFileSync(path.join(__dirname, "../logos/tapi.png"));
const ppLogo = fs.readFileSync(path.join(__dirname, "../logos/pplogo.png"));
const stampSign = fs.readFileSync(path.join(__dirname, "../stamps/stampSign.png"));
const stamp1 = fs.readFileSync(path.join(__dirname, "../stamps/stamp1.png"));

/* ===== NAME NORMALIZER ===== */
function normalizeName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .sort()
    .join(" ");
}

router.post("/generate-hallticket", async (req, res) => {
  try {
    let { fullName, mobile } = req.body;

    if (!fullName || !mobile) {
      return res.status(400).json({ message: "Full name and mobile are required" });
    }

    const inputName = fullName.trim().replace(/\s+/g, " ");
    mobile = mobile.trim();

    const student = await Student.findOne({ mobile }).lean(); // ⚡ faster
    if (!student) {
      return res.status(404).json({ message: "Mobile number not found" });
    }

    if (normalizeName(inputName) !== normalizeName(student.fullName)) {
      return res.status(400).json({ message: "Name & mobile do not match" });
    }

    /* ===== RESPONSE HEADERS (MOBILE FRIENDLY) ===== */
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=HallTicket_${mobile}.pdf`
    );

    /* ===== PDF STREAM DIRECT TO CLIENT ===== */
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const centerX = pageWidth / 2;

    /* ===== BORDER ===== */
    doc.rect(20, 20, 555, 802).stroke();

    /* ===== HEADER ===== */
    const logoSize = 60;
    const textWidth = 360;
    const gap = 20;

    const headerWidth = logoSize + gap + textWidth + gap + logoSize;
    const headerX = centerX - headerWidth / 2;
    const headerY = 45;

    doc.image(tapiLogo, headerX, headerY, { width: logoSize });
    doc.image(ppLogo, headerX + logoSize + gap + textWidth + gap, headerY, {
      width: logoSize
    });

    const textX = headerX + logoSize + gap;

    doc.font("Helvetica-Bold").fontSize(20)
      .text("TAPI EDUCATION ACADEMY", textX, headerY, {
        width: textWidth,
        align: "center"
      });

    doc.font("Helvetica-Bold").fontSize(15)
      .text("P.P SAVANI VIDHYAMANDIR", textX, headerY + 26, {
        width: textWidth,
        align: "center"
      });

    doc.font("Helvetica").fontSize(10)
      .text("AT POST KATHGADH VYARA, DIST. TAPI", textX, headerY + 46, {
        width: textWidth,
        align: "center"
      });

    /* ===== TITLE ===== */
    doc.font("Helvetica-Bold").fontSize(18)
      .text("HALL TICKET", 0, 130, {
        width: pageWidth,
        align: "center",
        underline: true
      });

    /* ===== NAME & SEAT ===== */
    const col1Width = 260;
    const col2Width = 200;
    const tableWidth = col1Width + col2Width;
    const tableX = centerX - tableWidth / 2;
    const lineY = 200;

    doc.fontSize(13).font("Helvetica-Bold")
      .text(`NAME: ${student.fullName}`, tableX, lineY, {
        width: col1Width
      });

    doc.text(`SEAT NO: ${student.rollNumber}`, tableX + col1Width, lineY, {
      width: col2Width,
      align: "right"
    });

    /* ===== DETAILS ===== */
    const tableY = lineY + 30;
    const rowHeight = 32;

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
        .text(row[0], tableX + 10, y + 9);

      doc.font("Helvetica").fontSize(12)
        .text(row[1] ?? "-", tableX + col1Width + 10, y + 9);
    });

    /* ===== INSTRUCTIONS ===== */
    doc.moveDown(2);
    doc.font("Helvetica-Bold").fontSize(12)
      .text("IMPORTANT INSTRUCTIONS:", tableX);

    doc.font("Helvetica").fontSize(10);
    hallTicketInstructions.forEach((inst, i) => {
      doc.text(`${i + 1}. ${inst}`, { width: tableWidth });
    });

    /* ===== STAMPS ===== */
    doc.moveDown(1.5);
    const stampY = doc.y;

    doc.image(stampSign, tableX, stampY, { width: 90 });
    doc.image(stamp1, tableX + tableWidth - 90, stampY, { width: 90 });

    /* ===== FOOTER ===== */
    doc.moveDown(5);
    doc.fontSize(10)
      .text("Note: This hall ticket must be carried to the examination hall.", {
        align: "center"
      });

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
