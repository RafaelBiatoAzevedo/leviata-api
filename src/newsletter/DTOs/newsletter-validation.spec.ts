import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { newsletterContent } from '../../../test/fixtures/newsletter-content';
import { renderNewsletter } from '../newsletter-renderer';
import { CreateNewsletterDto } from './create-newsletter.dto';
import { NewsletterPreviewDto } from './newsletter-preview.dto';
import { UpdateNewsletterDto } from './update-newsletter.dto';

describe('Newsletter draft validation', () => {
  it('previews the visual form with an empty subject and sentAt, preserving its stories', async () => {
    const contentData = newsletterContent();
    const item = contentData.sections[0].items[0];
    contentData.sections[0].items = [
      {
        ...item,
        title: '11° Encontro Escravidão e Liberdade',
        text: 'Participação dos membros do grupo em Pelotas.',
        imageUrl: '',
        imageAlt: '',
        linkUrl: '',
        details: '',
      },
      {
        ...item,
        id: 'second-story',
        title: 'XXXV Congresso de Iniciação Científica da UNESP',
        text: 'Participação das graduandas do curso de História.',
        imageUrl: '',
        imageAlt: '',
        linkUrl: '',
        details: '',
      },
    ];
    const body = {
      title:
        'Confira as últimas novidades do Grupo de Pesquisa Leviatã e o Cativeiro!',
      subject: '',
      htmlContent: '',
      contentData,
      coverUrl: '',
      publishedAt: '2023-10-01',
      sentAt: '',
    };
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    const dto = (await pipe.transform(body, {
      type: 'body',
      metatype: NewsletterPreviewDto,
    })) as NewsletterPreviewDto;
    expect(dto.sentAt).toBeUndefined();
    const html = renderNewsletter(dto, true);
    expect(html).toContain('11° Encontro Escravidão e Liberdade');
    expect(html).toContain('XXXV Congresso de Iniciação Científica da UNESP');
    expect(body.sentAt).toBe('');
  });

  it.each([CreateNewsletterDto, UpdateNewsletterDto])(
    'treats empty optional dates as absent in %p',
    async (Dto) => {
      const dto = plainToInstance(Dto, {
        title: 'Edição',
        subject: 'Novidades',
        publishedAt: '  ',
        sentAt: '',
      });
      expect(await validate(dto)).toEqual([]);
      expect(dto.publishedAt).toBeUndefined();
      expect(dto.sentAt).toBeUndefined();
    },
  );

  it.each([CreateNewsletterDto, UpdateNewsletterDto])(
    'preserves valid dates and rejects malformed nonempty dates in %p',
    async (Dto) => {
      const valid = plainToInstance(Dto, {
        title: 'Edição',
        subject: 'Novidades',
        publishedAt: '2023-10-01',
        sentAt: '2026-10-28T12:00:00.000Z',
      });
      expect(await validate(valid)).toEqual([]);
      expect(valid.publishedAt).toBe('2023-10-01');
      expect(valid.sentAt).toBe('2026-10-28T12:00:00.000Z');
      const invalid = plainToInstance(Dto, {
        title: 'Edição',
        subject: 'Novidades',
        publishedAt: 'invalid',
        sentAt: 'invalid',
      });
      expect((await validate(invalid)).map(({ property }) => property)).toEqual(
        expect.arrayContaining(['publishedAt', 'sentAt']),
      );
    },
  );

  it('still requires a title and subject when saving', async () => {
    const dto = plainToInstance(CreateNewsletterDto, {
      title: '',
      subject: '',
      sentAt: '',
    });
    expect((await validate(dto)).map(({ property }) => property)).toEqual(
      expect.arrayContaining(['title', 'subject']),
    );
  });
});
