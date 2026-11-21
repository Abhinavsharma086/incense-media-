import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getMasters,
  getMasterById,
  createMaster,
  updateMaster,
  deleteMaster,
} from '../controllers/master.controller';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({ storage });

const router = Router();

router.get('/', getMasters);
router.post('/', upload.single('image'), createMaster);
router.get('/:id', getMasterById);
router.put('/:id', upload.single('image'), updateMaster);
router.delete('/:id', deleteMaster);

export default router;
