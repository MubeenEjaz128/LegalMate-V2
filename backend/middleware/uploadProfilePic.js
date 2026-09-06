const multer = require('multer');
const path = require('path');

// Set up storage for profile pictures
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/profile-pictures'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, req.user.userId + '-' + Date.now() + ext);
  }
});

const upload = multer({ storage });

module.exports = upload;
