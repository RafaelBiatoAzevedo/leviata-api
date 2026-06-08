import { Test, TestingModule } from '@nestjs/testing';
import { JurisService } from './juris.service';

describe('JurisService', () => {
  let service: JurisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JurisService],
    }).compile();

    service = module.get<JurisService>(JurisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
