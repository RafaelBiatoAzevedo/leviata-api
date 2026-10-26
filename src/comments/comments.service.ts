import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCommentDto,
  ModerateCommentDto,
  PublicCommentsQueryDto,
} from './comments.dto';
import { findCommentTarget } from './comment-target';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(query: PublicCommentsQueryDto) {
    await findCommentTarget(this.prisma, query.targetType, query.targetId);
    const where = {
      targetType: query.targetType,
      targetId: query.targetId,
      status: 'APPROVED' as const,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where,
        select: { id: true, fullName: true, text: true, approvedAt: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.comment.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async create(dto: CreateCommentDto) {
    await this.prisma.$transaction(async (tx) => {
      const target = await findCommentTarget(tx, dto.targetType, dto.targetId);
      await tx.comment.create({
        data: {
          ...dto,
          status: 'PENDING',
          notification: {
            create: {
              type: 'COMMENT',
              title: 'Novo comentário para revisão',
              message:
                'Um visitante enviou um comentário. A publicação depende da aprovação de um superadministrador.',
              targetTitle: target.title,
              targetPath: target.path,
            },
          },
        },
      });
    });
    // No pending comment identifiers or content are exposed by public endpoints.
    return {
      message:
        'Comentário enviado! Ele será publicado após aprovação da equipe.',
    };
  }

  async moderate(id: string, dto: ModerateCommentDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.findUnique({
        where: { id },
        include: { notification: { select: { id: true } } },
      });
      if (!comment) throw new NotFoundException('Comentário não encontrado.');
      if (comment.status !== 'PENDING')
        throw new ConflictException('Este comentário já foi moderado.');
      if (dto.decision === 'approve') {
        await findCommentTarget(tx, comment.targetType, comment.targetId);
        const result = await tx.comment.updateMany({
          where: { id, status: 'PENDING' },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            approvedById: userId,
          },
        });
        if (!result.count)
          throw new ConflictException('Este comentário já foi moderado.');
      } else {
        // Deletion is conditional so a concurrent rejection cannot delete an approved comment.
        const result = await tx.comment.deleteMany({
          where: { id, status: 'PENDING' },
        });
        if (!result.count)
          throw new ConflictException('Este comentário já foi moderado.');
      }
      if (comment.notification) {
        const notificationId = comment.notification.id;
        await tx.notification.update({
          where: { id: notificationId },
          data: {
            resolution: dto.decision === 'approve' ? 'APPROVED' : 'REJECTED',
            resolvedAt: new Date(),
          },
        });
        await tx.notificationRead.upsert({
          where: { notificationId_userId: { notificationId, userId } },
          create: { notificationId, userId },
          update: {},
        });
      }
      return { decision: dto.decision };
    });
  }
}
