import { Test, TestingModule } from '@nestjs/testing';
import { JuriesService } from './juries.service';

describe('JuriesService', () => {
  let service: JuriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JuriesService],
    }).compile();

    service = module.get<JuriesService>(JuriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
