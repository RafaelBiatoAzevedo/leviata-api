import type { NewsletterContentDto } from '../../src/newsletter/DTOs/newsletter-content.dto';

export function newsletterContent(): NewsletterContentDto {
  return {
    version: 1,
    mode: 'visual',
    template: 'MAGAZINE',
    frame: 'double',
    background: 'paper',
    masthead: 'Leviatã News',
    tagline: 'História e pesquisa',
    editionLabel: 'Junho de 2026',
    intro: 'Bem-vindos à nossa edição.',
    footer: 'Grupo Leviatã e o Cativeiro',
    sections: [
      {
        id: 'section-1',
        title: 'Aconteceu',
        layout: 'stories',
        items: [
          {
            id: 'item-1',
            title: 'Encontro de pesquisadores',
            text: 'Primeiro parágrafo.\n\nLeia https://example.org/noticia.',
            details: 'UNESP/Franca · 15 de junho',
            imageUrl: 'https://example.org/foto.jpg',
            imageAlt: 'Participantes do encontro',
            linkUrl: 'https://example.org/mais',
            linkLabel: 'Saiba mais',
          },
        ],
      },
    ],
  };
}
