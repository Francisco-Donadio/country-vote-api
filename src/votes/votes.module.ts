import { Module } from '@nestjs/common';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';
import { CountriesModule } from '../countries/countries.module';

@Module({
  imports: [CountriesModule],
  controllers: [VotesController],
  providers: [VotesService],
})
export class VotesModule {}
