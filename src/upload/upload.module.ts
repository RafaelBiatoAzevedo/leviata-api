import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
      },
    }),
  ],
  exports: [MulterModule],
})
export class UploadModule {}
