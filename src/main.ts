import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { version } from '../package.json';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Leviatã e o Cativeiro')
    .setDescription(
      'Leviathan API is a RESTful backend service designed to manage and provide access to academic and historical research content. It supports the administration of publications, books, dossiers, researchers, institutions, examination boards, events, and digital assets through a secure and scalable architecture built with NestJS, Prisma, and PostgreSQL.',
    )
    .setVersion(version)
    .addTag(
      'Auth',
      'Handles user authentication, authorization, and access control.',
    )
    .addTag(
      'People',
      'Manages researchers, professors, students, collaborators, and other people related to the project.',
    )
    .addTag('Books', 'Manages books, publications, and bibliographic records.')
    .addTag(
      'Dossiers',
      'Manages academic dossiers, research collections, and related documents.',
    )
    .addTag(
      'Articles',
      'Manages academic articles, papers, and research publications.',
    )
    .addTag(
      'Boards',
      'Manages examination boards, thesis defenses, and qualification committees.',
    )
    .addTag(
      'Events',
      'Manages academic events, seminars, conferences, and related activities.',
    )
    .addTag(
      'Researchers',
      'Manages researchers, authors, scholars, and their academic profiles.',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;

  if (process.env.NODE_ENV !== 'production') {
    await app.listen(port);
  }
}
bootstrap();
