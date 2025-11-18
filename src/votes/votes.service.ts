import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from 'src/shared/services/database.service';
import { LoggerService } from 'src/shared/services/logger.service';
import { CountriesService } from '../countries/countries.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { TopCountryDto } from './dto/top-countries.dto';

@Injectable()
export class VotesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly countriesService: CountriesService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Submit a vote for a country
   * Requirement: Only one vote per email
   */
  async submitVote(createVoteDto: CreateVoteDto): Promise<void> {
    const { name, email, country: countryCode } = createVoteDto;
    this.logger.LogInfo(
      `Attempting to submit vote: email=${email}, country=${countryCode}`,
    );

    try {
      const existingUser = await this.db.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        this.logger.LogWarning(`Vote rejected - duplicate email: ${email}`);
        throw new ConflictException(
          'This email has already been used to vote. Only one vote per email is allowed.',
        );
      }

      // Validate country code exists in REST Countries API
      this.logger.LogInfo(`Validating country code: ${countryCode}`);
      const countryData = await this.countriesService.getCountryByCode(
        countryCode,
      );

      if (!countryData) {
        this.logger.LogError(
          `Invalid country code provided: ${countryCode}`,
          400,
        );
        throw new BadRequestException('Invalid country code');
      }

      let country = await this.db.country.findUnique({
        where: { code: countryCode },
      });

      if (!country) {
        this.logger.LogInfo(
          `Creating new country in database: ${countryData.name.common} (${countryCode})`,
        );
        country = await this.db.country.create({
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

      await this.db.$transaction([
        this.db.user.create({
          data: {
            name,
            email,
            countryId: country.id,
          },
        }),
        this.db.country.update({
          where: { id: country.id },
          data: { votes: { increment: 1 } },
        }),
      ]);

      this.logger.LogInfo(
        `Vote successfully submitted: ${name} voted for ${country.name} (${countryCode})`,
      );
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.LogError(`Failed to submit vote: ${error.message}`, 500);
      throw error;
    }
  }

  /**
   * Get top 10 countries by votes with full details
   */
  async getTopCountries(): Promise<TopCountryDto[]> {
    this.logger.LogInfo('Fetching top 10 countries');

    try {
      const countries = await this.db.country.findMany({
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

      this.logger.LogInfo(`Retrieved ${countries.length} countries with votes`);

      // Transform to DTO with rank
      return countries.map((country, index) => ({
        country: country.name,
        capital: country.capital || 'N/A',
        region: country.region,
        subRegion: country.subRegion,
        votes: country.votes,
        rank: index + 1,
      }));
    } catch (error) {
      this.logger.LogError(
        `Failed to fetch top countries: ${error.message}`,
        500,
      );
      throw error;
    }
  }

  /**
   * Search countries by name (case-insensitive)
   * Only returns countries that have votes
   */
  async searchCountries(query: string): Promise<TopCountryDto[]> {
    if (!query || query.trim().length === 0) {
      this.logger.LogInfo('Empty search query, returning top countries');
      return this.getTopCountries();
    }

    this.logger.LogInfo(`Searching countries with query: "${query}"`);

    try {
      const countries = await this.db.country.findMany({
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

      this.logger.LogInfo(
        `Search for "${query}" returned ${countries.length} results`,
      );

      // Transform to DTO with rank
      return countries.map((country, index) => ({
        country: country.name,
        capital: country.capital || 'N/A',
        region: country.region,
        subRegion: country.subRegion,
        votes: country.votes,
        rank: index + 1,
      }));
    } catch (error) {
      this.logger.LogError(`Failed to search countries: ${error.message}`, 500);
      throw error;
    }
  }
}
