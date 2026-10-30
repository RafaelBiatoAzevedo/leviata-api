import { Test } from '@nestjs/testing';
import { BoardType } from '@prisma/client';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';

describe('BoardsController', () => {
  it('encaminha o filtro de tipo tanto na lista pública quanto na paginação administrativa', async () => {
    const service = {
      findAll: jest.fn().mockResolvedValue([{ type: BoardType.DEFENSE }]),
      findPage: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const module = await Test.createTestingModule({
      controllers: [BoardsController],
      providers: [{ provide: BoardsService, useValue: service }],
    }).compile();
    const controller = module.get(BoardsController);
    const query = { type: BoardType.DEFENSE };
    expect(await controller.findAll(query)).toEqual([
      { type: BoardType.DEFENSE },
    ]);
    await controller.findPage(query);
    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(service.findPage).toHaveBeenCalledWith(query);
    await module.close();
  });
});
