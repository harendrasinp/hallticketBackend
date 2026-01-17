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

    // Name match check
    if (normalizeName(fullName) !== normalizeName(student.fullName)) {
      return res.status(400).json({ message: "Full name does not match" });
    }

    // ===== MEMORY-ONLY PDF =====
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=${student.fullName}_HallTicket.pdf`,
        "Content-Length": pdfData.length
      });
      res.end(pdfData);
    });

    const pageWidth = doc.page.width;
    const centerX = pageWidth / 2;

    // ===== BORDER =====
    doc.rect(20, 20, 555, 802).stroke();

    // ===== HEADER LOGO + SCHOOL INFO =====
    const logoPath = path.join(__dirname, "../logos/pplogo.png"); // Replace with actual logo
    try { doc.image(logoPath, centerX - 30, 30, { width: 60 }); } catch {}

    doc.font("Helvetica-Bold").fontSize(18)
      .text("TAPI EDUCATION ACADEMY", 0, 50, { width: pageWidth, align: "center" });

    doc.font("Helvetica-Bold").fontSize(16)
      .text("P.P SAVANI VIDHYAMANDIR", 0, 75, { width: pageWidth, align: "center" });

    doc.font("Helvetica").fontSize(12)
      .text("AT POST KATHGADH VYARA, DIST. TAPI", 0, 95, { width: pageWidth, align: "center" });

    // ===== TITLE =====
    doc.font("Helvetica-Bold").fontSize(18)
      .text("HALL TICKET", 0, 130, { width: pageWidth, align: "center", underline: true });

    // ===== STUDENT DETAILS TABLE =====
    const tableX = 100;
    let tableY = 170;
    const rowHeight = 25;

    const rows = [
      ["NAME", student.fullName],
      ["SEAT NO", student.rollNumber],
      ["STD", student.std],
      ["MEDIUM", student.medium],
      ["CENTER", student.center],
      ["EXAM NAME", student.examName],
      ["EXAM DATE", student.examDate],
    ];

    doc.font("Helvetica-Bold").fontSize(12);
    rows.forEach((row, i) => {
      doc.text(row[0], tableX, tableY + i * rowHeight);
      doc.font("Helvetica").text(row[1], tableX + 150, tableY + i * rowHeight);
      doc.font("Helvetica-Bold"); // reset bold for next key
    });

    tableY += rows.length * rowHeight + 20;

    // ===== INSTRUCTIONS =====
    doc.font("Helvetica-Bold").fontSize(12).text("IMPORTANT INSTRUCTIONS:", tableX, tableY);
    doc.font("Helvetica").fontSize(10);
    hallTicketInstructions.forEach((inst, i) => {
      doc.text(`${i + 1}. ${inst}`, { indent: 20, lineGap: 3 });
    });

    // ===== FOOTER =====
    doc.font("Helvetica-Oblique").fontSize(10)
      .text("Note: This hall ticket must be carried to the examination hall.", 0, doc.page.height - 50, {
        width: pageWidth,
        align: "center"
      });

    // End PDF
    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
