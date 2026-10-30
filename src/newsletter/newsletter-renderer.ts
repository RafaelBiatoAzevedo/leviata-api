import type { NewsletterContentDto } from './DTOs/newsletter-content.dto';

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );

function safeUrl(value: string | null | undefined, local = false) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ||
      (local && url.protocol === 'blob:')
      ? escape(url.href)
      : '';
  } catch {
    return '';
  }
}

function richText(value: string, ending = '') {
  // Text remains text; ordinary web addresses become links without accepting HTML.
  const paragraphs = value
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .filter((part) => part.trim())
    .map((part) => {
      // A pasted line wrap is not a paragraph break. Let the document width wrap it naturally.
      const linked = part
        .replace(/[ \t]*\n[ \t]*/g, ' ')
        .trim()
        .split(/(https?:\/\/[^\s<>]+)/g)
        .map((piece) => {
          if (!/^https?:\/\//.test(piece)) return escape(piece);
          const url = piece.replace(/[.,;:!?)]*$/, '');
          const suffix = piece.slice(url.length);
          return `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer" style="color:#80591f;text-decoration:underline;text-underline-offset:3px">${escape(url)}</a>${escape(suffix)}`;
        })
        .join('');
      return `<p class="nl-prose" style="margin:0 0 16px;font:16px/1.75 Arial,sans-serif;color:#35332e;text-align:justify;text-align-last:start">${linked}</p>`;
    });
  if (ending) {
    paragraphs.push(`<div class="nl-content-end">${ending}</div>`);
  }
  return paragraphs.join('');
}

export interface NewsletterRenderInput {
  title?: string;
  subject?: string;
  coverUrl?: string | null;
  htmlContent?: string;
  contentData?: NewsletterContentDto | null;
}

export const hasNewsletterContent = (data: NewsletterContentDto) =>
  data.sections.some((section) =>
    section.items.some((item) => item.title.trim() || item.text.trim()),
  );

export function renderNewsletter(
  input: NewsletterRenderInput,
  preview = false,
) {
  const cover =
    preview && input.coverUrl === '{{newsletterCover}}'
      ? input.coverUrl
      : safeUrl(input.coverUrl, preview);
  const data = input.contentData;
  if (!data || data.mode === 'html')
    return (data?.customHtml ?? input.htmlContent ?? '').replaceAll(
      '{{newsletterCover}}',
      cover,
    );
  const classic = data.template === 'CLASSIC';
  const editorial = data.template === 'EDITORIAL';
  const colors = classic
    ? { header: '#ad5e0b', ink: '#ffffff', accent: '#a65a0c', soft: '#fcf3e8' }
    : editorial
      ? {
          header: '#171b22',
          ink: '#f3d792',
          accent: '#a27b33',
          soft: '#faf5eb',
        }
      : {
          header: '#fff3d1',
          ink: '#20271f',
          accent: '#987329',
          soft: '#fcfaf3',
        };
  const background = { paper: '#f2ede3', white: '#f5f6f8', ink: '#1c2328' }[
    data.background
  ];
  const border =
    data.frame === 'double'
      ? '6px double #c6a15b'
      : data.frame === 'line'
        ? '1px solid #c6a15b'
        : '0';
  const photo = (url: string, alt: string, header = false) =>
    `<img class="${header ? 'nl-cover' : 'nl-image'}" src="${url}" alt="${escape(alt)}" width="${header ? 560 : 576}" style="display:block;box-sizing:border-box;max-width:100%;width:auto;height:auto;max-height:${header ? '360' : '520'}px;margin:0 auto;${header ? 'border:1px solid #c6a15b;border-radius:12px;' : 'border-radius:8px;'}">`;
  const sections = data.sections
    .map((section, sectionIndex) => {
      const items = section.items.filter(
        (item) => item.title.trim() || item.text.trim(),
      );
      if (!items.length) return '';
      const compact = section.layout === 'briefs';
      return `<tr><td class="nl-pad" style="padding:28px 32px 8px;background:#fff;text-align:center">
      <table class="nl-section" role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr class="nl-section-heading"><td style="border-top:1px solid #d9c6a0;padding:20px 0 8px;text-align:center">
      <span style="color:${colors.accent};font:11px Arial,sans-serif;letter-spacing:3px;text-transform:uppercase">${String(sectionIndex + 1).padStart(2, '0')} / ${escape(data.editionLabel || 'Leviatã News')}</span>
      <h2 style="margin:10px 0 20px;color:${colors.accent};font:${classic ? '28' : '30'}px/1.2 Georgia,serif;text-align:center">${escape(section.title || 'Em destaque')}</h2></td></tr>
      ${items
        .map((item, itemIndex) => {
          const image = safeUrl(item.imageUrl);
          const link = safeUrl(item.linkUrl);
          const action = link
            ? `<table class="nl-action" role="presentation" cellspacing="0" cellpadding="0" align="right" style="width:auto;float:none;margin:8px 0 0 auto"><tr><td bgcolor="${editorial ? '#20271f' : '#f3dfaa'}" style="border-radius:24px;padding:11px 20px"><a href="${link}" target="_blank" rel="noopener noreferrer" style="font:bold 12px Arial,sans-serif;letter-spacing:.3px;color:${editorial ? '#f9e4ae' : '#493710'};text-decoration:none">${escape(item.linkLabel || 'Saiba mais')} &rarr;</a></td></tr></table>`
            : '';
          const divider =
            itemIndex > 0
              ? '<tr class="nl-content-divider" aria-hidden="true"><td style="padding-top:20px;padding-bottom:20px"><div style="border-top:1px solid #d9c6a0;font-size:0;line-height:0"></div></td></tr>'
              : '';
          return `${divider}<tr class="${compact ? 'nl-brief' : 'nl-story'}"><td style="padding:${compact ? '18px 20px' : '0'};text-align:center;${compact ? `background:${colors.soft};border-left:3px solid ${colors.accent};` : ''}"><div class="nl-content-heading">
          ${item.title.trim() ? `<h3 style="margin:0 0 16px;color:#22281f;font:${compact ? 'bold 19px/1.4 Arial,sans-serif' : 'bold 25px/1.3 Georgia,serif'};text-align:center">${escape(item.title)}</h3>` : ''}
          ${!compact && image ? `<div style="margin:0 0 20px">${photo(image, item.imageAlt || item.title)}</div>` : ''}
          ${item.details.trim() ? `<p style="margin:0 0 12px;color:${colors.accent};font:bold 12px/1.6 Arial,sans-serif;text-align:center">${escape(item.details).replace(/\n/g, '<br>')}</p>` : ''}
          </div>${richText(item.text, action)}
        </td></tr>`;
        })
        .join('')}</table></td></tr>`;
    })
    .join('');
  // Tables and inline styles provide a usable baseline in email clients; decoration is progressive.
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(input.title || data.masthead)}</title>
  <style>body{margin:0!important;padding:0!important}table{border-collapse:collapse}img{border:0}a{word-break:break-word}@media(max-width:600px){.nl-outer{padding:12px 6px!important}.nl-pad{padding-left:20px!important;padding-right:20px!important}.nl-name{font-size:36px!important}}@media print{.nl-outer{padding:0!important}img,.nl-content-heading,.nl-section-heading,.nl-content-divider{break-inside:avoid}.nl-content-heading,.nl-section-heading,.nl-content-divider{break-after:avoid}.nl-content-end{break-before:avoid;break-inside:avoid}p{orphans:3;widows:3}}</style></head>
  <body style="margin:0;padding:0;background:${background}"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escape(input.subject || data.tagline)}</div>
  <table class="nl-background" role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${background}" style="background:${background};background-image:radial-gradient(ellipse at top,#c6a15b22,transparent 65%)"><tr><td class="nl-outer" align="center" style="padding:40px 16px">
  <table class="nl-document" role="presentation" align="center" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;margin:0 auto;background:#fff;border:${border};box-shadow:0 18px 60px #00000015">
  <tr><td class="nl-pad" align="center" bgcolor="${colors.header}" style="padding:34px 32px;background:${colors.header};color:${colors.ink}">
    <p style="margin:0 0 22px;font:10px/1.7 Arial,sans-serif;letter-spacing:3px;text-transform:uppercase">Grupo de pesquisa &nbsp; / &nbsp; História &amp; sociedade</p>
    ${cover ? `<div style="margin:0 0 28px">${photo(cover, input.title || data.masthead, true)}</div>` : ''}
    ${data.editionLabel ? `<p style="margin:0 0 12px;font:11px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase">${escape(data.editionLabel)}</p>` : ''}
    <h1 class="nl-name" style="margin:0;font:${classic ? 'bold ' : ''}46px/1.1 Georgia,serif;letter-spacing:-1px;color:${colors.ink}">${escape(data.masthead || 'Leviatã News')}</h1>
    ${data.tagline ? `<p style="margin:20px 0 4px;font:15px/1.7 Georgia,serif">${escape(data.tagline)}</p>` : ''}
    <div style="width:52px;height:2px;background:${editorial ? '#c6a15b' : colors.ink};margin:26px auto 0"></div>
  </td></tr>
  ${data.intro.trim() ? `<tr><td class="nl-pad" style="padding:30px 32px 0;text-align:center">${richText(data.intro)}</td></tr>` : ''}
  ${sections || (preview ? '<tr><td style="padding:40px;color:#666;text-align:center;font:16px Georgia,serif">As suas notícias e seções aparecerão aqui.</td></tr>' : '')}
  <tr class="nl-footer"><td class="nl-pad" style="padding:32px;background:${colors.soft};text-align:center;border-top:1px solid #d9c6a0">
    <p class="nl-prose" style="margin:0;color:#725e3a;font:14px/1.8 Georgia,serif;text-align:justify;text-align-last:start">${escape(data.footer || 'Leviatã e o Cativeiro').replace(/\n/g, '<br>')}</p>
  </td></tr></table></td></tr></table></body></html>`;
}
