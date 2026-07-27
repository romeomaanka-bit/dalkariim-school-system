const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentName: { type: String, required: true },
    teacher: { type: String, required: true },
    subject: { type: String, required: true },
    time: { type: String, required: true },
    status: { type: String, required: true }, // 'Present' ama 'Absent'
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Attendance', attendanceSchema);