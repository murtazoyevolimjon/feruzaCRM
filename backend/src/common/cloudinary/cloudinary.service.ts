import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: config.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /** Faylni Cloudinary ga yuklaydi va secure_url qaytaradi. */
  uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!file?.buffer) throw new BadRequestException('Fayl topilmadi');
    const safeName = file.originalname.replace(/[^\w.-]+/g, '_');

    return new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto', public_id: `${Date.now()}-${safeName}` },
        (error, result) => {
          if (error || !result) {
            return reject(
              new InternalServerErrorException('Faylni yuklashda xatolik yuz berdi'),
            );
          }
          resolve(result.secure_url);
        },
      );
      stream.end(file.buffer);
    });
  }
}
