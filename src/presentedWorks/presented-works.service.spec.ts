import { Test, TestingModule } from '@nestjs/testing';
import { PresentedWorksService } from './presented-works.service';

describe('PresentedWorksService', () => {
  let service: PresentedWorksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PresentedWorksService],
    }).compile();

    service = module.get<PresentedWorksService>(PresentedWorksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
