const mongoose = require('mongoose');

const banSchema = new mongoose.Schema({
    username: { type: String, required: true },
    robloxId: { type: Number, required: true },
    reason: { type: String, required: true },
    notes: { type: String, required: true },
    banLength: { type: String, required: true },
    deleteAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Ban', banSchema);
