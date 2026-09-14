import { Test, TestingModule } from '@nestjs/testing';
import { ResearchInstrumentsService } from './researchInstruments.service';

describe('ResearchInstrumentsService', () => {
  let service: ResearchInstrumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResearchInstrumentsService],
    }).compile();

    service = module.get<ResearchInstrumentsService>(
      ResearchInstrumentsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
