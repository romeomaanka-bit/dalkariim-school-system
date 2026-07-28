const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    username: { type: String, required: false },
    password: { type: String, required: false }
});

module.exports = mongoose.model('Teacher', teacherSchema);