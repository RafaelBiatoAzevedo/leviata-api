import { ApiPageResponse } from '../common/decorators/api-page-response.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  ParseFilePipe,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IUserJwt } from '../auth/jwt.strategy';
import { Public } from '../common/decorators/public.decorator';
import { CreateNewsletterDto } from './DTOs/create-newsletter.dto';
import { NewsletterQueryDto } from './DTOs/newsletter-query.dto';
import { NewsletterResponseDto } from './DTOs/newsletter-response.dto';
import { UpdateNewsletterDto } from './DTOs/update-newsletter.dto';
import { NewsletterService } from './newsletter.service';
import { SubscribeNewsletterDto } from './DTOs/subscribe-newsletter.dto';
import { NewsletterSubscriptionResponseDto } from './DTOs/newsletter-subscription-response.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateNewsletterWithCoverDto } from './DTOs/create-newsletter-with-cover.dto';
import { UploadImageResponseDto } from '../images/DTOs/upload-image-response.dto';

@UseGuards(JwtAuthGuard)
@Controller('newsletter')
@ApiTags('Newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Public()
  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe to the newsletter' })
  @ApiOkResponse({ type: NewsletterSubscriptionResponseDto })
  subscribe(@Body() dto: SubscribeNewsletterDto) {
    return this.newsletterService.subscribe(dto);
  }

  @ApiBearerAuth()
  @Post()
  @UseInterceptors(FileInterceptor('cover'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({ type: CreateNewsletterWithCoverDto })
  @ApiOperation({ summary: 'Create newsletter' })
  @ApiCreatedResponse({ type: NewsletterResponseDto })
  create(
    @Body() dto: CreateNewsletterDto,
    @UploadedFile() cover?: Express.Multer.File,
  ) {
    return this.newsletterService.create(dto, cover);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug/cover')
  @UseInterceptors(FileInterceptor('cover'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['cover'],
      properties: { cover: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Update newsletter cover' })
  @ApiOkResponse({ type: UploadImageResponseDto })
  updateCover(
    @Param('slug') slug: string,
    @UploadedFile(new ParseFilePipe()) cover: Express.Multer.File,
  ) {
    return this.newsletterService.updateCover(slug, cover);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List newsletters' })
  @ApiOkResponse({ type: NewsletterResponseDto, isArray: true })
  findAll(@Query() query: NewsletterQueryDto) {
    return this.newsletterService.findAll(query);
  }

  @ApiBearerAuth()
  @Get('paginated')
  @ApiOperation({ summary: 'List records with pagination totals' })
  @ApiPageResponse(NewsletterResponseDto)
  findPage(@Query() query: NewsletterQueryDto) {
    return this.newsletterService.findPage(query);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOkResponse({ type: NewsletterResponseDto })
  findOneById(@Param('id') id: string) {
    return this.newsletterService.findOneById(id);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOkResponse({ type: NewsletterResponseDto })
  updateById(@Param('id') id: string, @Body() dto: UpdateNewsletterDto) {
    return this.newsletterService.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiNoContentResponse()
  removeById(
    @Param('id') id: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.newsletterService.remove(id, req.user);
  }

  @ApiBearerAuth()
  @Get('slug/:slug')
  @ApiOkResponse({ type: NewsletterResponseDto })
  findOneBySlug(@Param('slug') slug: string) {
    return this.newsletterService.findOneBySlug(slug);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug')
  @ApiOkResponse({ type: NewsletterResponseDto })
  updateBySlug(@Param('slug') slug: string, @Body() dto: UpdateNewsletterDto) {
    return this.newsletterService.updateBySlug(slug, dto);
  }

  @ApiBearerAuth()
  @Delete('slug/:slug')
  @ApiNoContentResponse()
  removeBySlug(
    @Param('slug') slug: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.newsletterService.removeBySlug(slug, req.user);
  }
}
