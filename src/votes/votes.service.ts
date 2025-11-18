import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CountriesService } from '../countries/countries.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { TopCountryDto } from './dto/top-countries.dto';

@Injectable()
export class VotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly countriesService: CountriesService,
  ) {}

  /**
   * Submit a vote for a country
   * Requirement: Only one vote per email
   */
  async submitVote(createVoteDto: CreateVoteDto): Promise<void> {
    const { name, email, country: countryCode } = createVoteDto;

    // Check if user already voted
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(
        'This email has already been used to vote. Only one vote per email is allowed.',
      );
    }

    // Validate country code exists in REST Countries API
    const countryData = await this.countriesService.getCountryByCode(
      countryCode,
    );

    if (!countryData) {
      throw new BadRequestException('Invalid country code');
    }

    // Find or create country in database
    let country = await this.prisma.country.findUnique({
      where: { code: countryCode },
    });

    if (!country) {
      // Create country with details from REST Countries API
      country = await this.prisma.country.create({
        data: {
          code: countryCode,
          name: countryData.name.common,
          capital: countryData.capital?.[0] || 'N/A',
          region: countryData.region,
          subRegion: countryData.subregion || 'N/A',
          votes: 0,
        },
      });
    }

    // Create user and increment country votes in a transaction
    await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          name,
          email,
          countryId: country.id,
        },
      }),
      this.prisma.country.update({
        where: { id: country.id },
        data: { votes: { increment: 1 } },
      }),
    ]);
  }

  /**
   * Get top 10 countries by votes with full details
   */
  async getTopCountries(): Promise<TopCountryDto[]> {
    const countries = await this.prisma.country.findMany({
      where: {
        votes: {
          gt: 0,
        },
      },
      orderBy: {
        votes: 'desc',
      },
      take: 10,
    });

    // Transform to DTO with rank
    return countries.map((country, index) => ({
      country: country.name,
      capital: country.capital || 'N/A',
      region: country.region,
      subRegion: country.subRegion,
      votes: country.votes,
      rank: index + 1,
    }));
  }

  /**
   * Search countries by name (case-insensitive)
   * Only returns countries that have votes
   */
  async searchCountries(query: string): Promise<TopCountryDto[]> {
    if (!query || query.trim().length === 0) {
      return this.getTopCountries();
    }

    const countries = await this.prisma.country.findMany({
      where: {
        AND: [
          {
            votes: {
              gt: 0,
            },
          },
          {
            OR: [
              {
                name: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                capital: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                region: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                subRegion: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            ],
          },
        ],
      },
      orderBy: {
        votes: 'desc',
      },
      take: 10,
    });

    // Transform to DTO with rank
    return countries.map((country, index) => ({
      country: country.name,
      capital: country.capital || 'N/A',
      region: country.region,
      subRegion: country.subRegion,
      votes: country.votes,
      rank: index + 1,
    }));
  }
}
