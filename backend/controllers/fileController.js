import express from 'express';
import { auth } from '../middleware/auth.js';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { GridFSBucket } from 'mongodb';

dotenv.config();

const router = express.Router();

const storage = new GridFsStorage({
  url: process.env.MONGO,
  file: (req, file) => ({
    filename: file.originalname,
    bucketName: 'uploads', // collection name in MongoDB
    metadata: { user: req.user.id }
  }),
});
const upload = multer({ storage });

router.post('/receipt', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({
    fileId: req.file.id,
    filename: req.file.filename,
    originalname: req.file.originalname,
    contentType: req.file.contentType,
  });
});

router.get('/receipt/:id', auth, async (req, res) => {
  const db = mongoose.connection.db;
  const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.on('error', () => res.status(404).json({ message: 'File not found' }));
    downloadStream.pipe(res);
  } catch {
    res.status(400).json({ message: 'Invalid file id' });
  }
});

export default router; 