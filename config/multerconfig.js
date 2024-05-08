const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// disk Storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'images', 'uploads'));
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(12, (err, name) => {
      const fn = name.toString('hex') + path.extname(file.originalname);
      cb(null, fn)
    })
  }
})

// Export Upload Variable
const upload = multer({ storage });

module.exports = upload;