const express = require("express");
const router = express.Router();
const Student = require("../models/Students");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const hallTicketInstructions = require("../utils/instructions");
const data = require("../utils/data");

/* ===== AUTO FIT ONLY FOR NAME ===== */
function fitText(doc, text, maxWidth, startSize = 14, minSize = 9) {
  let size = startSize;
  doc.fontSize(size);
  while (doc.widthOfString(String(text)) > maxWidth && size > minSize) {
    size--;
    doc.fontSize(size);
  }
  return size;
}

/* ======================================================
   1️⃣ GET STUDENTS BY MOBILE (NEW API)
====================================================== */
router.post("/get-students-by-mobile", async (req, res) => {
  try {
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

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ======================================================
   2️⃣ GENERATE HALL TICKET (FULL PDF – UPDATED)
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

    /* ===== CREATE FOLDER ===== */
    const dir = path.join(__dirname, "../halltickets");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const fileName = `${student.mobile}_${Date.now()}.pdf`;
    const filePath = path.join(dir, fileName);

    /* ===== PDF DOCUMENT ===== */
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
      .text(data.tapi, textX, headerY, { width: textWidth, align: "center" });

    doc.font("Helvetica-Bold").fontSize(15)
      .text(data.schoolname, textX, headerY + 26, { width: textWidth, align: "center" });

    doc.font("Helvetica").fontSize(10)
      .text(data.atpost, textX, headerY + 46, { width: textWidth, align: "center" });

    /* ===== TITLE ===== */
    doc.font("Helvetica-Bold").fontSize(18)
      .text(data.hallticket, 0, 130, {
        width: pageWidth,
        align: "center",
        underline: true
      });

    /* ===== NAME & SEAT ===== */
    const col1Width = 200;
    const col2Width = 260;
    const tableWidth = col1Width + col2Width;
    const tableX = centerX - tableWidth / 2;
    const lineY = 180;

    const nameFontSize = fitText(doc, `NAME: ${student.fullName}`, col1Width);

    doc.font("Helvetica-Bold").fontSize(nameFontSize)
      .text(`NAME: ${student.fullName}`, tableX, lineY, { width: col1Width });

    doc.font("Helvetica-Bold").fontSize(10)
      .text(`SEAT NO: ${student.rollNumber}`, tableX + col1Width, lineY, {
        width: col2Width,
        align: "right"
      });

    /* ===== DETAILS TABLE ===== */
    const tableY = lineY + 30;
    const rowHeight = 30;

    const rows = [
      ["Std", student.std],
      ["Medium", student.medium],
      ["Center", "P.P Savani Vidhyamandir,Katgadh"],
      ["Exam Name", "Talent Search Examination 2026"],
      ["Exam Date", "1-Feb-2026"],
      ["Reporting Time", "8:15 AM"],
      ["Phone", student.mobile],
    ];

    doc.rect(tableX, tableY, tableWidth, rowHeight * rows.length).stroke();

    rows.forEach((row, i) => {
      const y = tableY + i * rowHeight;
      const label = row[0];
      const value = String(row[1] ?? "-");

      if (i > 0) doc.moveTo(tableX, y).lineTo(tableX + tableWidth, y).stroke();
      doc.moveTo(tableX + col1Width, y).lineTo(tableX + col1Width, y + rowHeight).stroke();

      doc.font("Helvetica-Bold").fontSize(12)
        .text(label, tableX + 10, y + 10, { width: col1Width - 20 });

      doc.font("Helvetica").fontSize(11)
        .text(value, tableX + col1Width + 10, y + 10, {
          width: col2Width - 20,
          ellipsis: true
        });
    });

    /* ===== INSTRUCTIONS ===== */
    const gujaratiFont = path.join(__dirname, "../fonts/NotoSansGujarati-Regular.ttf");

    doc.moveDown(2);
    doc.font(gujaratiFont).fontSize(12)
      .text("મહત્વપૂર્ણ સૂચનાઓ:", tableX, doc.y, { width: tableWidth });

    doc.moveDown(0.5);
    doc.font(gujaratiFont).fontSize(10);

    hallTicketInstructions.forEach((inst, i) => {
      doc.text(`${i + 1}. ${inst}`, {
        width: tableWidth,
        lineGap: 3
      });
    });

    /* ===== STAMPS ===== */
    doc.moveDown(1.5);
    const stampY = doc.y;
    const stampWidth = 90;

    doc.image(path.join(__dirname, "../stamps/stampSig.jpeg"), tableX, stampY, { width: stampWidth });
    doc.image(
      path.join(__dirname, "../stamps/stamp.jpeg"),
      tableX + tableWidth - stampWidth,
      stampY,
      { width: stampWidth }
    );

    /* ===== FOOTER ===== */
    doc.moveDown(6);
    doc.fontSize(10).text(data.note, 0, doc.y, {
      width: pageWidth,
      align: "center"
    });

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
