import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { VotesService } from './votes.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { TopCountryDto } from './dto/top-countries.dto';

@Controller('votes')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async submitVote(
    @Body(ValidationPipe) createVoteDto: CreateVoteDto,
  ): Promise<{ message: string }> {
    await this.votesService.submitVote(createVoteDto);
    return { message: 'Vote submitted successfully' };
  }

  @Get('top')
  async getTopCountries(): Promise<{ data: TopCountryDto[] }> {
    const data = await this.votesService.getTopCountries();
    return { data };
  }

  @Get('search')
  async searchCountries(
    @Query('q') query: string,
  ): Promise<{ data: TopCountryDto[] }> {
    const data = await this.votesService.searchCountries(query);
    return { data };
  }
}
