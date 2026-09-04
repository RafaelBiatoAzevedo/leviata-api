import { PartialType } from '@nestjs/swagger';
import { CreatePresentedWorkDto } from './create-presented-work.dto';

export class UpdatePresentedWorkDto extends PartialType(
  CreatePresentedWorkDto,
) {}
