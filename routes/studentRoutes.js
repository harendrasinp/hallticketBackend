const express = require("express");
const router = express.Router();
const Student = require("../models/Students");
const PDFDocument = require("pdfkit");
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
        "Content-Disposition": `attachment; filename=${student.fullName}.pdf`,
        "Content-Length": pdfData.length
      });
      res.end(pdfData);
    });

    // ===== PDF CONTENT =====
    const pageWidth = doc.page.width;
    const centerX = pageWidth / 2;

    // Border
    doc.rect(20, 20, 555, 802).stroke();

    // Header
    doc.font("Helvetica-Bold").fontSize(18)
      .text("HALL TICKET", 0, 50, { width: pageWidth, align: "center", underline: true });

    doc.moveDown(2);
    doc.font("Helvetica-Bold").fontSize(14).text(`NAME: ${student.fullName}`);
    doc.font("Helvetica-Bold").fontSize(14).text(`SEAT NO: ${student.rollNumber}`);
    doc.font("Helvetica").fontSize(12)
      .text(`Std: ${student.std}, Medium: ${student.medium}, Center: ${student.center}`);
    doc.font("Helvetica").fontSize(12).text(`Exam Name: ${student.examName}`);
    doc.font("Helvetica").fontSize(12).text(`Exam Date: ${student.examDate}`);

    // Instructions
    doc.moveDown();
    doc.font("Helvetica-Bold").fontSize(12).text("IMPORTANT INSTRUCTIONS:");
    doc.font("Helvetica").fontSize(10);
    hallTicketInstructions.forEach((inst, i) => doc.text(`${i + 1}. ${inst}`));

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
