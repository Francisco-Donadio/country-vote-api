import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from './shared/shared.module';
import { CountriesModule } from './countries/countries.module';
import { VotesModule } from './votes/votes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    CountriesModule,
    VotesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
