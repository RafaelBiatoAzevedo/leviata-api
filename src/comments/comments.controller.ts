import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IUserJwt } from '../auth/jwt.strategy';
import { Public } from '../common/decorators/public.decorator';
import { SuperAdminGuard } from '../users/super-admin.guard';
import { CommentThrottleGuard } from './comment-throttle.guard';
import { CommentsService } from './comments.service';
import {
  CreateCommentDto,
  ModerateCommentDto,
  PublicCommentsQueryDto,
} from './comments.dto';

@ApiTags('Comments')
@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List only approved comments for an available page',
  })
  findPublic(@Query() query: PublicCommentsQueryDto) {
    return this.service.findPublic(query);
  }

  @Public()
  @Post()
  @UseGuards(CommentThrottleGuard)
  @ApiOperation({
    summary:
      'Submit a comment for superadmin moderation (5 requests per minute per IP)',
  })
  create(@Body() dto: CreateCommentDto) {
    return this.service.create(dto);
  }

  @ApiBearerAuth()
  @Patch(':id/moderation')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary:
      'Approve a pending comment or permanently delete a rejected comment',
  })
  moderate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateCommentDto,
    @Req() req: { user: IUserJwt },
  ) {
    return this.service.moderate(id, dto, req.user.id);
  }
}
