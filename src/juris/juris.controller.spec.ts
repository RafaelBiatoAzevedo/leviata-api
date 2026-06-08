import { Test, TestingModule } from '@nestjs/testing';
import { JurisController } from './juris.controller';

describe('JurisController', () => {
  let controller: JurisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JurisController],
    }).compile();

    controller = module.get<JurisController>(JurisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
