export interface CloudinaryUploadOptions {
  folder: string;
  resourceType?: 'image' | 'auto' | 'raw' | 'video';
  publicId?: string;
  displayName?: string;
}
