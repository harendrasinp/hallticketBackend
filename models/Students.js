const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
  },
  std:String,
  medium: String,
  rollNumber: String,
  examName: String,
  center: String,
  examDate: String,
});

module.exports = mongoose.model("Student", studentSchema);
