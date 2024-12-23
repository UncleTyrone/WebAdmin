// models/Kick.js
const mongoose = require('mongoose');

const kickSchema = new mongoose.Schema({
    username: { type: String, required: true },
    reason: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Kick', kickSchema);
