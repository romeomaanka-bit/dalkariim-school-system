const mongoose = require('mongoose');

const classRoomSchema = new mongoose.Schema({
    className: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        default: '' 
    },
    // Halkan waxaad ku dari kartaa xogaha kale ee aad rabto in database-ka lagu kaydiyo, tusaale ahaan:
    // level: { type: String },
    // teacherInCharge: { type: String }
}, { timestamps: true });

const ClassRoom = mongoose.model('ClassRoom', classRoomSchema);

exports = module.exports = ClassRoom;