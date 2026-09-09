import { Test, TestingModule } from '@nestjs/testing';
import { ThematicsController } from './thematics.controller';

describe('ThematicsController', () => {
  let controller: ThematicsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThematicsController],
    }).compile();

    controller = module.get<ThematicsController>(ThematicsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
