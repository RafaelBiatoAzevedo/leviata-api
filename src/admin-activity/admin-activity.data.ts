import type { Prisma, AdminActivity } from '@prisma/client';
import type { IUserJwt } from '../auth/jwt.strategy';

export interface ActivityRequest {
  user: IUserJwt;
  method: string;
  originalUrl?: string;
  url: string;
  body?: unknown;
  params?: unknown;
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
}

const secretKey =
  /password|senha|token|secret|authorization|cookie|credential|api[-_]?key|pdfContent|buffer/i;

export function activityData(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): Prisma.InputJsonValue | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string')
    return /^data:[^,]*;base64,/i.test(value)
      ? '[arquivo incorporado omitido]'
      : value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value))
    return { bytes: value.length, content: '[arquivo omitido]' };
  if (typeof value !== 'object') return null;
  if (depth > 12 || seen.has(value)) return '[referência omitida]';
  seen.add(value);
  const result = Array.isArray(value)
    ? value.map((item) => activityData(item, seen, depth + 1))
    : Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          secretKey.test(key)
            ? '[sigiloso]'
            : activityData(item, seen, depth + 1),
        ]),
      );
  seen.delete(value);
  return result;
}

export function activityDetails(
  request: ActivityRequest,
  result?: unknown,
): Prisma.InputJsonObject {
  const files = [
    ...(request.file ? [request.file] : []),
    ...(Array.isArray(request.files)
      ? request.files
      : Object.values(request.files ?? {}).flat()),
  ];
  return {
    submitted: activityData(request.body),
    parameters: activityData(request.params),
    saved: activityData(result),
    files: files.map((file) => ({
      name: file.originalname,
      type: file.mimetype,
      bytes: file.size,
    })),
  };
}

const resources: Record<string, string> = {
  books: 'Livro',
  articles: 'Artigo / dossiê',
  people: 'Pessoa',
  boards: 'Banca',
  juries: 'Júri histórico',
  meetings: 'Evento',
  news: 'Notícia',
  newsletter: 'Newsletter',
  research: 'Pesquisa',
  researchInstruments: 'Instrumento de pesquisa',
  thematics: 'Linha temática',
  videos: 'Vídeo',
  'presented-works': 'Apresentação de trabalho',
  schedule: 'Agenda',
  users: 'Minha conta',
  notifications: 'Notificação',
  mail: 'Envio de newsletter',
};
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );

export function activityMessage(activity: AdminActivity) {
  const resource = resources[activity.path.split('/')[1]] ?? activity.path;
  const action =
    activity.outcome === 'UNCONFIRMED'
      ? 'Resultado a conferir'
      : ['PATCH', 'PUT'].includes(activity.method)
        ? 'Edição'
        : activity.path.split('/').filter(Boolean).length === 1
          ? 'Cadastro'
          : 'Ação';
  const date = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(activity.completedAt ?? activity.createdAt);
  const identity = `${activity.actorName || 'Administrador'} <${activity.actorEmail}>`;
  const details = JSON.stringify(activity.details, null, 2);
  const warning =
    activity.outcome === 'UNCONFIRMED'
      ? '\nA ação foi iniciada, mas sua conclusão não foi confirmada. Confira o registro no sistema antes de repetir a operação.\n'
      : '';
  const heading = `${action}: ${resource}`;
  const text = `${heading}\nAdministrador: ${identity}\nID do administrador: ${activity.actorId}\nData (Brasília): ${date}\nOperação: ${activity.method} ${activity.path}\nRegistro de auditoria: ${activity.id}\n${warning}\nDados enviados, arquivos e resultado salvo:\n${details}`;
  return {
    subject: `[Leviatã] ${heading}`,
    text,
    html: `<h1>${escape(heading)}</h1><p><strong>Administrador:</strong> ${escape(identity)}</p><p><strong>Data (Brasília):</strong> ${escape(date)}</p><p><strong>Operação:</strong> ${escape(`${activity.method} ${activity.path}`)}</p>${warning ? `<p>${escape(warning)}</p>` : ''}<p>Auditoria: ${escape(activity.id)}. ID do administrador: ${escape(activity.actorId)}.</p><h2>Dados enviados, arquivos e resultado salvo</h2><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(details)}</pre>`,
  };
}
