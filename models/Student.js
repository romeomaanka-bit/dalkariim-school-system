const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    classRoom: { type: String, required: true },
    phone: { type: String, required: false } // Halkan waxaa laga dhigay ikhtiyaari si uusan khalad u keenin
});

module.exports = mongoose.model('Student', studentSchema);