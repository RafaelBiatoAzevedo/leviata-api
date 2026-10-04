import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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

@UseGuards(JwtAuthGuard)
@Controller('newsletter')
@ApiTags('Newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create newsletter' })
  @ApiCreatedResponse({ type: NewsletterResponseDto })
  create(@Body() dto: CreateNewsletterDto) {
    return this.newsletterService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List newsletters' })
  @ApiOkResponse({ type: NewsletterResponseDto, isArray: true })
  findAll(@Query() query: NewsletterQueryDto) {
    return this.newsletterService.findAll(query);
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
