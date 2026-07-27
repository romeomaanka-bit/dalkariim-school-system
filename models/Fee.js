const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
    studentName: { type: String, required: true },
    amount: { type: Number, required: true },
    month: { type: String, required: true }
});

module.exports = mongoose.model('Fee', feeSchema);