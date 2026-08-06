import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { CloudinaryUploadOptions } from './interfaces/CloudnaryOptions';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async upload(
    file: any,
    options: CloudinaryUploadOptions,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          resource_type: options.resourceType ?? 'auto',
          public_id: options.publicId,
          display_name: options.displayName,

          overwrite: true,
          invalidate: true,
          unique_filename: false,
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }

          resolve(result as UploadApiResponse);
        },
      );

      Readable.from(file.buffer).pipe(upload);
    });
  }

  async rename(
    oldPublicId: string,
    newPublicId: string,
    resourceType?: string,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result: UploadApiResponse = await cloudinary.uploader.rename(
      oldPublicId,
      newPublicId,
      {
        resource_type: resourceType ?? 'image',
      },
    );

    return {
      public_id: result.public_id,
      url: result.secure_url,
    };
  }

  async updateDisplayName(publicId: string, displayName: string) {
    await cloudinary.api.update(publicId, {
      display_name: displayName,
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
