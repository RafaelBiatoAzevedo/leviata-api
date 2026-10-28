import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pdfAsset } from './pdf-assets';

// Bump this version when PDF-only print styles or pagination structure change.
export const newsletterPdfHash = (html: string) =>
  createHash('sha256')
    .update('newsletter-pdf-layout-v4\0')
    .update(html)
    .digest('hex');
export const newsletterPdfPath = (id: string) =>
  `/newsletter/${encodeURIComponent(id)}/pdf`;
export const newsletterPdfFilename = (slug: string) =>
  `${slug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 140) || 'newsletter'}.pdf`;

@Injectable()
export class NewsletterPdfService {
  private readonly logger = new Logger(NewsletterPdfService.name);
  private tail: Promise<void> = Promise.resolve();
  private pending = 0;

  async render(html: string): Promise<Buffer> {
    if (this.pending >= 4)
      throw new ServiceUnavailableException(
        'A geração de PDFs está ocupada. Tente novamente em instantes.',
      );
    this.pending++;
    const task = this.tail.then(() => this.generate(html));
    this.tail = task.then(
      () => undefined,
      () => undefined,
    );
    try {
      return await task;
    } finally {
      this.pending--;
    }
  }

  private async generate(html: string) {
    const puppeteer = (await import('puppeteer')).default;
    const executablePath =
      process.env.NEWSLETTER_PDF_EXECUTABLE_PATH ||
      [
        '/opt/google/chrome/chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
      ].find((path) => existsSync(path));
    const browser = await puppeteer
      .launch({
        headless: true,
        executablePath,
        timeout: 30000,
        args: [
          '--disable-dev-shm-usage',
          ...(process.env.NEWSLETTER_PDF_NO_SANDBOX === 'true'
            ? ['--no-sandbox', '--disable-setuid-sandbox']
            : []),
        ],
      })
      .catch(() => {
        throw new ServiceUnavailableException(
          'Não foi possível iniciar o gerador de PDF. Verifique a instalação do Chrome na API.',
        );
      });
    try {
      const page = await browser.newPage();
      await page.setViewport({
        width: 800,
        height: 1100,
        deviceScaleFactor: 1,
      });
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      const assets = new Map<
        string,
        Promise<{ body: Buffer; contentType: string }>
      >();
      let failedAsset = false;
      page.on('request', (request) => {
        void (async () => {
          const url = request.url();
          if (url.startsWith('data:')) {
            await request.continue();
            return;
          }
          if (
            !['image', 'font', 'stylesheet'].includes(request.resourceType()) ||
            assets.size >= 50
          ) {
            await request.abort();
            return;
          }
          try {
            let asset = assets.get(url);
            if (!asset) {
              asset = pdfAsset(url);
              assets.set(url, asset);
            }
            const result = await asset;
            await request.respond({ status: 200, ...result });
          } catch {
            failedAsset = true;
            await request.abort().catch(() => undefined);
          }
        })().catch(() => {
          failedAsset = true;
        });
      });
      await page.emulateMediaType('screen');
      await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        if (
          Array.from(document.images).some(
            (image) => !image.complete || !image.naturalWidth,
          )
        )
          throw new Error('Uma imagem não pôde ser carregada.');
      });
      if (failedAsset)
        throw new Error('Não foi possível carregar as imagens ou fontes.');
      // Email clients need presentation tables. PDF pagination needs normal block flow,
      // otherwise Chromium can detach a heading or footer even with break rules.
      await page.evaluate(() => {
        function block(element: Element) {
          const replacement = document.createElement('div');
          for (const attribute of element.attributes)
            replacement.setAttribute(attribute.name, attribute.value);
          const width = element.getAttribute('width');
          if (width && !replacement.style.width)
            replacement.style.width = /^\d+$/.test(width)
              ? `${width}px`
              : width;
          replacement.style.boxSizing = 'border-box';
          replacement.replaceChildren(...element.childNodes);
          element.replaceWith(replacement);
        }
        const tables = Array.from(
          document.querySelectorAll(
            'table.nl-background,table.nl-document,table.nl-section',
          ),
        ).reverse();
        for (const table of tables) {
          for (const group of Array.from(table.children)) {
            for (const row of Array.from(group.children)) {
              for (const cell of Array.from(row.children)) block(cell);
              block(row);
            }
            block(group);
          }
          block(table);
        }
        const footer = document.querySelector('.nl-document .nl-footer');
        const lastSection = footer?.previousElementSibling;
        const stories = lastSection?.querySelectorAll('.nl-story,.nl-brief');
        if (footer && lastSection && stories?.length) {
          const tail = document.createElement('div');
          tail.className = 'nl-print-tail';
          footer.before(tail);
          if (stories.length === 1) {
            tail.append(lastSection);
          } else {
            const content = document.createElement('div');
            content.className = 'nl-pad';
            content.style.cssText = 'padding:0 32px 8px;background:#fff';
            const lastStory = stories[stories.length - 1];
            const divider = lastStory.previousElementSibling;
            if (divider?.matches('.nl-content-divider'))
              content.append(divider);
            content.append(lastStory);
            tail.append(content);
          }
          tail.append(footer);
        }
      });
      await page.addStyleTag({
        content: `@page{size:A4;margin:8mm 7mm}
          html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
          p{orphans:3;widows:3}h1,h2,h3{break-inside:avoid;break-after:avoid}
          .nl-story>div>p{line-height:1.65!important;margin-bottom:12px!important}
          img,.nl-content-heading,.nl-content-end,.nl-brief,.nl-section-heading,.nl-content-divider{break-inside:avoid}
          .nl-section-heading,.nl-content-heading,.nl-content-divider{break-after:avoid}
          .nl-content-end{break-before:avoid}
          .nl-footer{break-inside:avoid;break-before:avoid}
          .nl-print-tail{break-inside:avoid}
          .nl-footer>.nl-pad{padding:16px 32px!important}
          .nl-background,.nl-document,.nl-section,.nl-background>tbody,.nl-document>tbody,.nl-section>tbody,.nl-background>tbody>tr,.nl-document>tbody>tr,.nl-section>tbody>tr,.nl-background>tbody>tr>td,.nl-document>tbody>tr>td,.nl-section>tbody>tr>td{display:block;box-sizing:border-box}
          .nl-document{margin-inline:auto;text-align:left;box-shadow:none!important;box-decoration-break:clone;-webkit-box-decoration-break:clone}
          .nl-outer{padding:12px 16px 0!important}`,
      });
      const bytes = await page.pdf({
        format: 'A4',
        scale: 0.93,
        printBackground: true,
        preferCSSPageSize: true,
        waitForFonts: true,
        timeout: 30000,
      });
      if (bytes.length > 15 * 1024 * 1024)
        throw new Error('PDF muito grande. Reduza as imagens da edição.');
      return Buffer.from(bytes);
    } catch {
      this.logger.warn(
        'A geração do PDF não foi concluída; a edição anterior foi preservada.',
      );
      throw new ServiceUnavailableException(
        'Não foi possível gerar o PDF. Confira as imagens da edição e tente salvar novamente.',
      );
    } finally {
      await browser.close();
    }
  }
}
