import { Test, TestingModule } from '@nestjs/testing';
import { ResearchInstrumentsController } from './researchInstruments.controller';

describe('ResearchInstrumentsController', () => {
  let controller: ResearchInstrumentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResearchInstrumentsController],
    }).compile();

    controller = module.get<ResearchInstrumentsController>(
      ResearchInstrumentsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
