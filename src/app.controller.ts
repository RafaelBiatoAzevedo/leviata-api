import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Response } from 'express';

@Controller()
export class AppController {
  @Get('/')
  @ApiExcludeEndpoint()
  redirectToDocs(@Res() res: Response): void {
    res.redirect('/docs');
  }
}
