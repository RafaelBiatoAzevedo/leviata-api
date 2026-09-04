import { Test, TestingModule } from '@nestjs/testing';
import { PresentedWorksController } from './presented-works.controller';

describe('PresentedWorksController', () => {
  let controller: PresentedWorksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PresentedWorksController],
    }).compile();

    controller = module.get<PresentedWorksController>(PresentedWorksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
