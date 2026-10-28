import { lookup } from 'node:dns/promises';
import { get as httpGet } from 'node:http';
import { get as httpsGet } from 'node:https';
import { isIP } from 'node:net';

export function publicPdfAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized.startsWith('::ffff:'))
    return publicPdfAddress(normalized.slice(7));
  if (isIP(normalized) === 6)
    return !/^(::|fc|fd|fe[89ab]|ff)/.test(normalized) && normalized !== '::1';
  if (isIP(normalized) !== 4) return false;
  const [a, b] = normalized.split('.').map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

// Fetch with a pinned, validated DNS result. Chromium never contacts arbitrary hosts itself.
export async function pdfAsset(
  value: string,
  redirects = 0,
): Promise<{ body: Buffer; contentType: string }> {
  const url = new URL(value);
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    redirects > 3
  )
    throw new Error('Endereço de imagem inválido.');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = await lookup(hostname, { all: true });
  if (
    !addresses.length ||
    addresses.some((address) => !publicPdfAddress(address.address))
  )
    throw new Error('Endereço de imagem indisponível.');
  const pinned = addresses[0];
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? httpsGet : httpGet)(
      url,
      {
        lookup: (_hostname, options, callback) => {
          if (options.all) callback(null, [pinned]);
          else callback(null, pinned.address, pinned.family);
        },
        headers: { 'User-Agent': 'Leviata-Newsletter-PDF/1.0' },
        timeout: 10000,
      },
      (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          pdfAsset(
            new URL(response.headers.location, url).href,
            redirects + 1,
          ).then(resolve, reject);
          return;
        }
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error('Imagem indisponível.'));
          return;
        }
        const contentType =
          response.headers['content-type'] || 'application/octet-stream';
        if (
          !/^(image\/|font\/|text\/css|application\/(font|x-font|vnd\.ms-fontobject|octet-stream))/.test(
            contentType,
          )
        ) {
          response.resume();
          reject(new Error('Formato de imagem inválido.'));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 10 * 1024 * 1024) {
            response.destroy(new Error('Imagem muito grande.'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () =>
          resolve({ body: Buffer.concat(chunks), contentType }),
        );
        response.on('error', reject);
      },
    );
    request.on('timeout', () =>
      request.destroy(new Error('Tempo de carregamento excedido.')),
    );
    request.on('error', reject);
  });
}
