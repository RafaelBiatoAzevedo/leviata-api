import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { newsletterContent } from '../../test/fixtures/newsletter-content';
import { CreateNewsletterDto } from './DTOs/create-newsletter.dto';
import { renderNewsletter } from './newsletter-renderer';

describe('Newsletter visual renderer', () => {
  it.each(['CLASSIC', 'EDITORIAL', 'MAGAZINE'] as const)(
    'renders %s as a complete document with accessible content and links',
    (template) => {
      const data = { ...newsletterContent(), template };
      const html = renderNewsletter({
        title: 'Edição de junho',
        contentData: data,
        coverUrl: 'https://example.org/capa.png',
      });
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('Leviatã News');
      expect(html).toContain('Aconteceu');
      expect(html).toContain('alt="Participantes do encontro"');
      expect(html).toContain('href="https://example.org/noticia"');
      expect(html).not.toContain('href="https://example.org/noticia."');
      expect(html).toContain('role="presentation"');
      expect(html).toContain('border:6px double');
      expect(html).toContain('https://example.org/capa.png');
    },
  );

  it('escapes ordinary text and drops executable URLs without interpreting pasted HTML', () => {
    const data = newsletterContent();
    data.sections[0].title = '<script>alert(1)</script>';
    Object.assign(data.sections[0].items[0], {
      text: '<img src=x onerror=alert(1)>',
      imageUrl: 'javascript:alert(1)',
      linkUrl: 'javascript:alert(1)',
    });
    const html = renderNewsletter({ contentData: data });
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('javascript:');
  });

  it.each(['CLASSIC', 'EDITORIAL', 'MAGAZINE'] as const)(
    'justifies %s paragraphs, keeps centered headings and details, and preserves links and dividers',
    (template) => {
      const data = newsletterContent();
      data.template = template;
      Object.assign(data.sections[0].items[0], {
        text: 'Texto copiado de um PDF\ncom linhas quebradas.\n\nSegundo parágrafo.',
        details: 'UNESP/campus de Franca/SP',
      });
      data.sections[0].items.push({
        ...data.sections[0].items[0],
        id: 'second-item',
        title: 'Segundo conteúdo',
      });
      const html = renderNewsletter({ contentData: data });
      expect(html).toContain('Texto copiado de um PDF com linhas quebradas.');
      expect(html).not.toContain('PDF<br>');
      expect(html).toMatch(
        /text-align:justify;text-align-last:start">Texto copiado/,
      );
      expect(html).toMatch(
        /class="nl-prose"[^>]*text-align:justify[^>]*>Bem-vindos/,
      );
      expect(html).toMatch(
        /class="nl-prose"[^>]*text-align:justify[^>]*>Grupo Leviatã/,
      );
      expect(html).toMatch(/<h3[^>]*text-align:center/);
      expect(html).toMatch(/text-align:center">UNESP\/campus de Franca\/SP/);
      expect(html).toMatch(/class="nl-action"[^>]*align="right"/);
      expect(html).toContain('float:none;margin:8px 0 0 auto');
      expect(html.match(/class="nl-content-divider"/g) || []).toHaveLength(1);
      expect(html).toContain('padding-top:20px;padding-bottom:20px');
      expect(html).not.toMatch(/class="nl-content-end"><p/);
      expect(html).toMatch(/class="nl-content-end"><table class="nl-action"/);
    },
  );

  it('supports compact calls, skips empty blocks, and preserves the requested order', () => {
    const data = newsletterContent();
    const item = data.sections[0].items[0];
    data.sections = [
      {
        ...data.sections[0],
        title: 'Chamadas',
        layout: 'briefs',
        items: [
          { ...item, id: 'empty', title: '', text: '' },
          { ...item, title: 'Segundo assunto' },
          { ...item, title: 'Primeiro assunto' },
        ],
      },
    ];
    const html = renderNewsletter({ contentData: data });
    expect(html).toContain('Chamadas');
    expect(html).toMatch(/class="nl-prose"[^>]*text-align:justify/);
    expect(html).not.toContain('src="https://example.org/foto.jpg"');
    expect(html.indexOf('Segundo assunto')).toBeLessThan(
      html.indexOf('Primeiro assunto'),
    );
    expect((html.match(/UNESP\/Franca/g) || []).length).toBe(2);
  });

  it('allows local covers only for previews and resolves an advanced cover placeholder', () => {
    const contentData = newsletterContent();
    expect(
      renderNewsletter({ contentData, coverUrl: 'blob:local-cover' }),
    ).not.toContain('blob:local-cover');
    expect(
      renderNewsletter({ contentData, coverUrl: 'blob:local-cover' }, true),
    ).toContain('blob:local-cover');
    contentData.mode = 'html';
    contentData.customHtml =
      '<h1>Personalizado</h1><img src="{{newsletterCover}}">';
    expect(
      renderNewsletter({
        contentData,
        htmlContent: 'outdated',
        coverUrl: 'https://example.org/final.png',
      }),
    ).toBe('<h1>Personalizado</h1><img src="https://example.org/final.png">');
    expect(renderNewsletter({ htmlContent: '<h1>Legado</h1>' })).toBe(
      '<h1>Legado</h1>',
    );
    expect(
      renderNewsletter({ contentData, coverUrl: '{{newsletterCover}}' }, true),
    ).toContain('src="{{newsletterCover}}"');
    expect(
      renderNewsletter({ contentData, coverUrl: '{{newsletterCover}}' }),
    ).not.toContain('{{newsletterCover}}');
  });

  it('validates structured content sent as JSON or a multipart text field', async () => {
    for (const contentData of [
      newsletterContent(),
      JSON.stringify(newsletterContent()),
    ]) {
      const dto = plainToInstance(CreateNewsletterDto, {
        title: 'Edição',
        subject: 'Assunto',
        contentData,
      });
      expect(
        await validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
      ).toEqual([]);
      expect(dto.contentData?.sections[0].items[0].title).toBe(
        'Encontro de pesquisadores',
      );
    }
  });

  it.each([
    'broken-json',
    [],
    { ...newsletterContent(), template: 'invalid' },
    {
      ...newsletterContent(),
      sections: [
        { ...newsletterContent().sections[0], items: [{ title: 123 }] },
      ],
    },
  ])(
    'rejects invalid structured content before persistence',
    async (contentData) => {
      const dto = plainToInstance(CreateNewsletterDto, {
        title: 'Edição',
        subject: 'Assunto',
        contentData,
      });
      expect((await validate(dto)).length).toBeGreaterThan(0);
    },
  );
});
