import { ApiProperty } from '@nestjs/swagger';

export class NewsletterSubscriptionResponseDto {
  @ApiProperty({ example: 'Inscrição realizada com sucesso.' })
  message!: string;
}
