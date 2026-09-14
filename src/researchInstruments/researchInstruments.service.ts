import { Injectable, NotFoundException } from '@nestjs/common';
import { generateSlug } from 'src/common/utils/slug.util';
import { IUserJwt } from 'src/auth/jwt.strategy';
import { ResearchInstrumentsRepository } from './researchInstruments.repository';
import { UpdateResearchInstrumentDto } from './DTOs/update-researchInstrument.dto';
import { ResearchInstrumentsQueryDto } from './DTOs/researchInstrument-query.dto';
import { CreateResearchInstrumentDto } from './DTOs/create-researchInstrument.dto';
import { ResearchInstrument } from '@prisma/client';
import { CloudinaryUploadOptions } from 'src/cloudinary/interfaces/CloudnaryOptions';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class ResearchInstrumentsService {
  constructor(
    private readonly researchInstrumentsRepository: ResearchInstrumentsRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private folderCloudinaryName = 'leviata/pdfs/research-instruments/';

  private async changePdf(slug: string, file: any) {
    const cloudinaryOptions: CloudinaryUploadOptions = {
      folder: `${this.folderCloudinaryName}`,
      resourceType: 'raw',
      publicId: slug,
      displayName: slug,
    };

    return this.cloudinaryService.upload(file, cloudinaryOptions);
  }

  private async prepareResearchInstrumentUpdate(
    researchInstrumentFound: ResearchInstrument,
    dto: UpdateResearchInstrumentDto,
  ) {
    let slug = researchInstrumentFound.slug;
    let pdfUrl = researchInstrumentFound.pdfUrl;
    let pdfPublicId = researchInstrumentFound.pdfPublicId;

    if (dto.title && dto.title !== researchInstrumentFound.title) {
      const baseSlug = generateSlug(dto.title);

      let newSlug = baseSlug;
      let counter = 2;

      while (
        await this.researchInstrumentsRepository.existsSlug(
          newSlug,
          researchInstrumentFound.id,
        )
      ) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      slug = newSlug;

      if (pdfPublicId) {
        const newPublicId = `${this.folderCloudinaryName}${newSlug}`;

        const result = await this.cloudinaryService.rename(
          pdfPublicId,
          newPublicId,
        );

        if (result) {
          await this.cloudinaryService.updateDisplayName(
            result.public_id,
            newSlug,
          );

          pdfPublicId = result.public_id;
          pdfUrl = result.url;
        }
      }
    }

    return {
      ...dto,
      slug,
      pdfUrl,
      pdfPublicId,
      ...(dto.people! && {
        people: {
          set: dto.people.map((id) => ({ id })),
        },
      }),
    };
  }

  async create(dto: CreateResearchInstrumentDto, pdf?: any) {
    let pdfUrl: string | undefined;
    let pdfPublicId: string | undefined;
    let slug = generateSlug(dto.title);
    let counter = 2;

    while (await this.researchInstrumentsRepository.existsSlug(slug)) {
      slug = `${generateSlug(dto.title)}-${counter++}`;
    }

    if (pdf) {
      const result = await this.changePdf(slug, pdf);

      pdfUrl = result.url;
      pdfPublicId = result.public_id;
    }

    const researchInstrumentInput = {
      ...dto,
      slug,
      pdfUrl,
      pdfPublicId,
      people: {
        connect: dto.people.map((id) => ({
          id,
        })),
      },
    };

    const researchInstrument = await this.researchInstrumentsRepository.create(
      researchInstrumentInput,
    );

    return researchInstrument;
  }

  async findAll(query: ResearchInstrumentsQueryDto) {
    const researchInstruments =
      await this.researchInstrumentsRepository.findAll(query);

    return researchInstruments;
  }

  async findOneById(id: string) {
    const researchInstrument =
      await this.researchInstrumentsRepository.findById(id);

    if (!researchInstrument) {
      throw new NotFoundException('ResearchInstrument not found.');
    }

    return researchInstrument;
  }

  async update(id: string, dto: UpdateResearchInstrumentDto) {
    const researchInstrumentFound = await this.findOneById(id);

    const researchInstrumentUpdate = await this.prepareResearchInstrumentUpdate(
      researchInstrumentFound,
      dto,
    );

    return this.researchInstrumentsRepository.update(
      researchInstrumentFound.id,
      researchInstrumentUpdate,
    );
  }

  async updateBySlug(slug: string, dto: UpdateResearchInstrumentDto) {
    const researchInstrumentFound = await this.findOneBySlug(slug);

    const researchInstrumentUpdate = await this.prepareResearchInstrumentUpdate(
      researchInstrumentFound,
      dto,
    );

    return this.researchInstrumentsRepository.update(
      researchInstrumentFound.id,
      researchInstrumentUpdate,
    );
  }

  async remove(id: string, user: IUserJwt) {
    const researchInstrumentFound = await this.findOneById(id);

    await this.researchInstrumentsRepository.remove(
      researchInstrumentFound.id,
      user.id,
    );

    return;
  }

  async findOneBySlug(slug: string) {
    const researchInstrumentFound =
      await this.researchInstrumentsRepository.findBySlug(slug);

    if (!researchInstrumentFound) {
      throw new NotFoundException('ResearchInstrument not found.');
    }

    return researchInstrumentFound;
  }

  async removeBySlug(slug: string, user: IUserJwt) {
    const researchInstrumentFound = await this.findOneBySlug(slug);

    await this.researchInstrumentsRepository.remove(
      researchInstrumentFound.id,
      user.id,
    );

    return;
  }

  async uploadPdf(slug: string, file: any) {
    const researchInstrument =
      await this.researchInstrumentsRepository.findBySlug(slug);

    if (!researchInstrument) {
      throw new NotFoundException('Research instrument not found.');
    }

    const result = await this.changePdf(slug, file);

    await this.researchInstrumentsRepository.update(researchInstrument.id, {
      pdfUrl: result.url,
      pdfPublicId: result.public_id,
    });

    return {
      url: result.url,
      public_id: result.public_id,
    };
  }

  async removePdf(slug: string) {
    const researchInstrument =
      await this.researchInstrumentsRepository.findBySlug(slug);

    if (!researchInstrument) {
      throw new NotFoundException('Research instrument not found.');
    }

    await this.cloudinaryService.deleteFile(
      `${this.folderCloudinaryName}${slug}`,
    );

    await this.researchInstrumentsRepository.update(researchInstrument.id, {
      pdfUrl: null,
      pdfPublicId: null,
    });
  }
}
