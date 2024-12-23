const mongoose = require('mongoose');

const pendingActionSchema = new mongoose.Schema({
    actionType: { type: String, required: true },
    robloxId: { type: Number, required: true },
    reason: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('PendingAction', pendingActionSchema);
