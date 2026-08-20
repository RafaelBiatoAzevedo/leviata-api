import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BoardsModule } from './boards/boards.module';
import { BooksModule } from './books/books.module';
import { PeopleModule } from './people/people.module';
import { ArticlesModule } from './articles/articles.module';
import { JurisModule } from './juris/juris.module';
import { MeetingsModule } from './meetings/meetings.module';
import { SeminarsModule } from './seminars/seminars.module';
import { NewsModule } from './news/news.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { CountriesModule } from './countries/countries.module';
import { AcademicTitlesModule } from './academic-titles/academic-titles.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { UploadModule } from './upload/upload.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    PrismaModule,
    UploadModule,
    CloudinaryModule,

    CountriesModule,
    AcademicTitlesModule,
    InstitutionsModule,

    AuthModule,
    UsersModule,
    PeopleModule,
    BooksModule,
    ArticlesModule,
    NewsModule,
    BoardsModule,
    JurisModule,
    MeetingsModule,
    SeminarsModule,
    NewsletterModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
