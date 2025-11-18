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
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@Controller('votes')
@ApiTags('votes')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a vote' })
  @ApiCreatedResponse({
    description: 'The vote has been successfully submitted.',
  })
  // add body example
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        country: { type: 'string' },
      },
    },
    examples: {
      example: {
        value: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          country: 'USA',
        },
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async submitVote(
    @Body(ValidationPipe) createVoteDto: CreateVoteDto,
  ): Promise<{ message: string }> {
    await this.votesService.submitVote(createVoteDto);
    return { message: 'Vote submitted successfully' };
  }

  @Get('top')
  @ApiOperation({ summary: 'Get top 10 countries' })
  @ApiOkResponse({
    description: 'The top 10 countries have been successfully fetched.',
    type: [TopCountryDto],
  })
  async getTopCountries(): Promise<{ data: TopCountryDto[] }> {
    const data = await this.votesService.getTopCountries();
    return { data };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search countries' })
  @ApiOkResponse({
    description: 'The countries have been successfully fetched.',
    type: [TopCountryDto],
  })
  async searchCountries(
    @Query('q') query: string,
  ): Promise<{ data: TopCountryDto[] }> {
    const data = await this.votesService.searchCountries(query);
    return { data };
  }
}
