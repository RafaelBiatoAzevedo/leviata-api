import { Test, TestingModule } from '@nestjs/testing';
import { JuriesController } from './juries.controller';

describe('JuriesController', () => {
  let controller: JuriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JuriesController],
    }).compile();

    controller = module.get<JuriesController>(JuriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
