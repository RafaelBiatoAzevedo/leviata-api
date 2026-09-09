import { PartialType } from '@nestjs/swagger';
import { CreateThematicDto } from './create-thematic.dto';

export class UpdateThematicDto extends PartialType(CreateThematicDto) {}
