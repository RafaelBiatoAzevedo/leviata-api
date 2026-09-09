import { Test, TestingModule } from '@nestjs/testing';
import { ThematicsService } from './thematics.service';

describe('ThematicsService', () => {
  let service: ThematicsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ThematicsService],
    }).compile();

    service = module.get<ThematicsService>(ThematicsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
