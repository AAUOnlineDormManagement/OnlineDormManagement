const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isConfigured: isCloudinaryConfigured } = require('../config/cloudinary');

// Use cloud storage only when Cloudinary credentials are configured.
const useCloudStorage = isCloudinaryConfigured;

// ── Disk storage (local development without Cloudinary) ──────────────────────
let storage;

if (useCloudStorage) {
    // Use memory storage so we can pipe the buffer to Cloudinary
    storage = multer.memoryStorage();
    console.log('📦 Multer: using memory storage (cloud upload)');
} else {
    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'uploads/profiles');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads/profiles');
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
        }
    });
    console.log('📦 Multer: using disk storage (local)');
}

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

module.exports = upload;
