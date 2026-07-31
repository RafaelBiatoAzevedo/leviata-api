import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DossiersModule } from './dossiers/dossiers.module';
import { BoardsModule } from './boards/boards.module';
import { BooksModule } from './books/books.module';
import { PeopleModule } from './people/people.module';
import { ArticlesModule } from './articles/articles.module';
import { JurisModule } from './juris/juris.module';
import { MeetingModule } from './meeting/meeting.module';
import { SeminarsModule } from './seminars/seminars.module';
import { NewsModule } from './news/news.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { CountriesModule } from './countries/countries.module';
import { AcademicTitlesModule } from './academic-titles/academic-titles.module';
import { InstitutionsModule } from './institutions/institutions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    PrismaModule,

    AuthModule,
    UsersModule,
    DossiersModule,
    BoardsModule,
    BooksModule,
    PeopleModule,
    ArticlesModule,
    JurisModule,
    MeetingModule,
    SeminarsModule,
    NewsModule,
    NewsletterModule,
    CountriesModule,
    AcademicTitlesModule,
    InstitutionsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
