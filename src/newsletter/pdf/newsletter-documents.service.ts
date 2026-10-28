import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { NewsletterContentDto } from '../DTOs/newsletter-content.dto';
import { renderNewsletter } from '../newsletter-renderer';
import {
  NewsletterPdfService,
  newsletterPdfFilename,
  newsletterPdfHash,
  newsletterPdfPath,
} from './newsletter-pdf.service';

@Injectable()
export class NewsletterDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: NewsletterPdfService,
  ) {}

  async ensure(id: string) {
    const newsletter = await this.prisma.newsletter.findFirst({
      where: { id, deletedAt: null },
    });
    if (!newsletter) throw new NotFoundException('Newsletter não encontrada.');
    const contentData =
      newsletter.contentData as unknown as NewsletterContentDto | null;
    const htmlContent =
      contentData?.mode === 'visual'
        ? renderNewsletter({ ...newsletter, contentData })
        : newsletter.htmlContent;
    const hash = newsletterPdfHash(htmlContent);
    if (newsletter.pdfContent && newsletter.pdfSourceHash === hash)
      return {
        newsletter,
        content: Buffer.from(newsletter.pdfContent),
        filename: newsletterPdfFilename(newsletter.slug),
      };
    const content = await this.pdf.render(htmlContent);
    const generatedAt = new Date();
    const updated = await this.prisma.newsletter.updateMany({
      where: {
        id,
        htmlContent: newsletter.htmlContent,
        updatedAt: newsletter.updatedAt,
        deletedAt: null,
      },
      data: {
        htmlContent,
        pdfContent: new Uint8Array(content),
        pdfSourceHash: hash,
        pdfGeneratedAt: generatedAt,
        pdfUrl: newsletterPdfPath(id),
      },
    });
    if (!updated.count)
      throw new ConflictException(
        'A edição foi alterada durante a geração. Tente novamente.',
      );
    return {
      newsletter: {
        ...newsletter,
        htmlContent,
        pdfGeneratedAt: generatedAt,
        pdfSourceHash: hash,
      },
      content,
      filename: newsletterPdfFilename(newsletter.slug),
    };
  }
}
