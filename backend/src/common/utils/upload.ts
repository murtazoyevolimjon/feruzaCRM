import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const MB = 1024 * 1024;

function filtered(maxMb: number, mimePrefixes?: string[]): MulterOptions {
  return {
    limits: { fileSize: maxMb * MB },
    fileFilter: (_req, file, cb) => {
      if (mimePrefixes && !mimePrefixes.some((p) => file.mimetype.startsWith(p))) {
        return cb(new BadRequestException("Fayl turi qo'llab-quvvatlanmaydi"), false);
      }
      cb(null, true);
    },
  };
}

/** Rasm: 5 MB gacha. */
export const imageUpload = filtered(5, ['image/']);
/** Uyga vazifa fayllari: 20 MB gacha. */
export const documentUpload = filtered(20);
/** Dars videolari: 200 MB gacha (xotirada buferlanadi). */
export const videoUpload = filtered(200, ['video/']);
