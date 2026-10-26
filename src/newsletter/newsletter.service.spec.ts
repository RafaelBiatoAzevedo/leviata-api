import { Test, TestingModule } from '@nestjs/testing';
import { NewsletterService } from './newsletter.service';
import { NewsletterRepository } from './newsletter.repository';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

describe('NewsletterService', () => {
  let service: NewsletterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterService,
        { provide: NewsletterRepository, useValue: {} },
        { provide: CloudinaryService, useValue: {} },
      ],
    }).compile();

    service = module.get<NewsletterService>(NewsletterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
