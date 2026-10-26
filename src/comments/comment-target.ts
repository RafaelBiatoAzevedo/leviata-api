import { NotFoundException } from '@nestjs/common';
import { CommentTarget, Prisma } from '@prisma/client';

// All lookups check publication eligibility, including soft deletion.
export async function findCommentTarget(
  db: Prisma.TransactionClient,
  type: CommentTarget,
  id: string,
) {
  const where = { id, deletedAt: null };
  const select = { title: true, slug: true };
  let target: { title: string; slug: string } | null;
  let path: string;
  switch (type) {
    case CommentTarget.THEMATIC:
      target = await db.thematic.findFirst({ where, select });
      path = '/grupo/linhas-tematicas/tematica/';
      break;
    case CommentTarget.RESEARCH_INSTRUMENT: {
      const instrument = await db.researchInstrument.findFirst({
        where,
        select: { ...select, type: true },
      });
      target = instrument;
      path =
        instrument?.type === 'DOSSIER'
          ? '/instrumentos/planilhas-biblio-tematicas/dossie/'
          : instrument?.type === 'CATALOG'
            ? '/instrumentos/catalogos/'
            : '/instrumentos/banco-de-dados/';
      break;
    }
    case CommentTarget.BOARD:
      target = await db.board.findFirst({ where, select });
      path = '/agenda/bancas/';
      break;
    case CommentTarget.JURY:
      target = await db.jury.findFirst({ where, select });
      path = '/atividades/juris-historicos/juris/';
      break;
    case CommentTarget.MEETING: {
      const meeting = await db.meeting.findFirst({
        where,
        select: { ...select, type: true },
      });
      target = meeting;
      path =
        meeting?.type === 'SEMINAR'
          ? '/atividades/seminarios/'
          : meeting?.type === 'DOCUMENTARY'
            ? '/atividades/mostra-de-documentarios/'
            : '/atividades/encontros/';
      break;
    }
    case CommentTarget.PRESENTED_WORK:
      target = await db.presentedWork.findFirst({ where, select });
      path = '/atividades/apresentacoes-trabalhos/';
      break;
    case CommentTarget.RESEARCH:
      target = await db.search.findFirst({ where, select });
      path = '/atividades/pesquisas/';
      break;
    case CommentTarget.NEWS:
      target = await db.news.findFirst({ where, select });
      path = '/noticias/';
      break;
    default:
      throw new NotFoundException('Página não encontrada.');
  }
  if (!target)
    throw new NotFoundException('Página não encontrada ou indisponível.');
  return {
    title: target.title,
    path: `${path}${encodeURIComponent(target.slug || id)}`,
  };
}
