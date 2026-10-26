import { convert } from 'html-to-text';

export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );

export function newsletterMessage(input: {
  title: string;
  htmlContent: string;
  portalUrl: string;
  unsubscribeUrl?: string;
}) {
  const footer = `<div style="margin-top:32px;padding:24px;border-top:1px solid #c6a15b;font:13px/1.7 Arial,sans-serif;color:#555;text-align:center">
    <strong>Leviatã e o Cativeiro</strong><br>
    <a href="${escapeHtml(input.portalUrl)}" style="color:#7c5a20">Ver newsletters no portal</a>
    ${input.unsubscribeUrl ? `<br>Você recebe esta newsletter porque se inscreveu no portal.<br><a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#7c5a20">Cancelar inscrição por e-mail</a>` : '<br>Este é um envio de teste da newsletter.'}
  </div>`;
  const html = /<body[\s>]/i.test(input.htmlContent)
    ? /<\/body\s*>/i.test(input.htmlContent)
      ? input.htmlContent.replace(/<\/body\s*>/i, `${footer}</body>`)
      : input.htmlContent + footer
    : `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.title)}</title></head><body style="margin:0;padding:24px;background:#fcfaf5"><main style="max-width:680px;margin:auto;background:#fff;padding:24px">${input.htmlContent}${footer}</main></body></html>`;
  return {
    html,
    text: convert(html, {
      wordwrap: 90,
      selectors: [{ selector: 'img', format: 'skip' }],
    }),
  };
}
