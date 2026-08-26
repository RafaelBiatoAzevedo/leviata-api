import { Injectable, NotFoundException } from '@nestjs/common';
import { generateSlug } from 'src/common/utils/slug.util';
import { IUserJwt } from 'src/auth/jwt.strategy';
import { BoardsRepository } from './boards.repository';
import { UpdateBoardDto } from './DTOs/update-board.dto';
import { BoardsQueryDto } from './DTOs/board-query.dto';
import { CreateBoardDto } from './DTOs/create-board.dto';
import { Board } from '@prisma/client';

@Injectable()
export class BoardsService {
  constructor(private readonly boardsRepository: BoardsRepository) {}

  private async prepareBoardUpdate(boardFound: Board, dto: UpdateBoardDto) {
    let slug = boardFound.slug;

    if (dto.title && dto.title !== boardFound.title) {
      const baseSlug = generateSlug(dto.title);

      let newSlug = baseSlug;
      let counter = 2;

      while (await this.boardsRepository.existsSlug(newSlug, boardFound.id)) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      slug = newSlug;
    }

    return {
      ...dto,
      slug,
      ...(dto.members! && {
        members: {
          set: dto.members.map((id) => ({ id })),
        },
      }),
    };
  }

  async create(dto: CreateBoardDto) {
    let slug = generateSlug(dto.title);
    let counter = 2;

    while (await this.boardsRepository.existsSlug(slug)) {
      slug = `${generateSlug(dto.title)}-${counter++}`;
    }

    const boardInput = {
      ...dto,
      slug,
      members: {
        connect: dto.members.map((id) => ({
          id,
        })),
      },
    };

    const board = await this.boardsRepository.create(boardInput);

    return board;
  }

  async findAll(query: BoardsQueryDto) {
    const boards = await this.boardsRepository.findAll(query);

    return boards;
  }

  async findOneById(id: string) {
    const board = await this.boardsRepository.findById(id);

    if (!board) {
      throw new NotFoundException('Board not found.');
    }

    return board;
  }

  async update(id: string, dto: UpdateBoardDto) {
    const boardFound = await this.findOneById(id);

    const boardUpdate = await this.prepareBoardUpdate(boardFound, dto);

    return this.boardsRepository.update(boardFound.id, boardUpdate);
  }

  async updateBySlug(slug: string, dto: UpdateBoardDto) {
    const boardFound = await this.findOneBySlug(slug);

    const boardUpdate = await this.prepareBoardUpdate(boardFound, dto);

    return this.boardsRepository.update(boardFound.id, boardUpdate);
  }

  async remove(id: string, user: IUserJwt) {
    const boardFound = await this.findOneById(id);

    await this.boardsRepository.remove(boardFound.id, user.id);

    return;
  }

  async findOneBySlug(slug: string) {
    const boardFound = await this.boardsRepository.findBySlug(slug);

    if (!boardFound) {
      throw new NotFoundException('Board not found.');
    }

    return boardFound;
  }

  async removeBySlug(slug: string, user: IUserJwt) {
    const boardFound = await this.findOneBySlug(slug);

    await this.boardsRepository.remove(boardFound.id, user.id);

    return;
  }
}
