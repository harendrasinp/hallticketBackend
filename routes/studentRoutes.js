const express = require("express");
const router = express.Router();
const Student = require("../models/Students");
const PDFDocument = require("pdfkit");
const path = require("path");
const hallTicketInstructions = require("../utils/instructions");

/* ===== NAME NORMALIZER FUNCTION ===== */
function normalizeName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, " ").split(" ").sort().join(" ");
}

router.post("/generate-hallticket", async (req, res) => {
  try {
    const { fullName, mobile } = req.body;

    if (!fullName || !mobile) {
      return res.status(400).json({ message: "Full name and mobile are required" });
    }

    const student = await Student.findOne({ mobile });
    if (!student) return res.status(404).json({ message: "Mobile number not found" });

    if (normalizeName(fullName) !== normalizeName(student.fullName)) {
      return res.status(400).json({ message: "Full name does not match" });
    }

    // ===== DIRECT STREAM PDF TO CLIENT =====
    const doc = new PDFDocument({ size: "A4", margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=${student.fullName}_HallTicket.pdf`
    );

    doc.pipe(res); // 🔑 Directly stream to response

    const pageWidth = doc.page.width;
    const centerX = pageWidth / 2;

    // ===== BORDER =====
    doc.rect(20, 20, 555, 802).stroke();

    // ===== HEADER LOGOS & SCHOOL TEXT =====
    const logoSize = 65;
    const textWidth = 360;
    const gap = 20;
    const headerWidth = logoSize + gap + textWidth + gap + logoSize;
    const headerX = centerX - headerWidth / 2;
    const headerY = 45;

    try {
      doc.image(path.join(__dirname, "../logos/tapi.png"), headerX, headerY, { width: logoSize });
      doc.image(path.join(__dirname, "../logos/pplogo.png"), headerX + logoSize + gap + textWidth + gap, headerY, { width: logoSize });
    } catch (e) { console.warn("Logo missing:", e.message); }

    const textX = headerX + logoSize + gap;
    doc.font("Helvetica-Bold").fontSize(20)
      .text("TAPI EDUCATION ACADEMY", textX, headerY, { width: textWidth, align: "center" });
    doc.font("Helvetica-Bold").fontSize(15)
      .text("P.P SAVANI VIDHYAMANDIR", textX, headerY + 26, { width: textWidth, align: "center" });
    doc.font("Helvetica").fontSize(10)
      .text("AT POST KATHGADH VYARA, DIST. TAPI", textX, headerY + 46, { width: textWidth, align: "center" });

    // ===== TITLE =====
    doc.font("Helvetica-Bold").fontSize(18)
      .text("HALL TICKET", 0, 130, { width: pageWidth, align: "center", underline: true });

    // ===== STUDENT NAME & SEAT NO =====
    const col1Width = 260;
    const col2Width = 200;
    const tableWidth = col1Width + col2Width;
    const tableX = centerX - tableWidth / 2;
    const lineY = 200;

    let nameFontSize = 14;
    doc.font("Helvetica-Bold");
    while (doc.widthOfString(`NAME: ${student.fullName}`, { size: nameFontSize }) > col1Width && nameFontSize > 9) {
      nameFontSize--;
    }

    doc.fontSize(nameFontSize)
      .text(`NAME: ${student.fullName}`, tableX, lineY, { width: col1Width });
    doc.fontSize(nameFontSize)
      .text(`SEAT NO: ${student.rollNumber}`, tableX + col1Width, lineY, { width: col2Width, align: "right" });

    // ===== DETAILS TABLE =====
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

      doc.font("Helvetica-Bold").fontSize(12).text(row[0], tableX + 10, y + 10, { width: col1Width - 20 });
      doc.font("Helvetica").fontSize(12).text(String(row[1] ?? "-"), tableX + col1Width + 10, y + 10, { width: col2Width - 20 });
    });

    // ===== INSTRUCTIONS =====
    doc.moveDown(2);
    doc.font("Helvetica-Bold").fontSize(12).text("IMPORTANT INSTRUCTIONS:", tableX, doc.y, { width: tableWidth });
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10);
    hallTicketInstructions.forEach((inst, i) => doc.text(`${i + 1}. ${inst}`, { width: tableWidth, lineGap: 3 }));

    // ===== STAMPS =====
    const stampY = doc.y + 20;
    const stampWidth = 90;
    try {
      doc.image(path.join(__dirname, "../stamps/stampSign.png"), tableX, stampY, { width: stampWidth });
      doc.image(path.join(__dirname, "../stamps/stamp1.png"), tableX + tableWidth - stampWidth, stampY, { width: stampWidth });
    } catch (e) { console.warn("Stamp missing:", e.message); }

    // ===== FOOTER =====
    doc.moveDown(6);
    doc.fontSize(10).text(
      "Note: This hall ticket must be carried to the examination hall.",
      0, doc.y, { width: pageWidth, align: "center" }
    );

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
