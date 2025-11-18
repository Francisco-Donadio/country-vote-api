import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { VotesService } from './votes.service';
import { DatabaseService } from '../shared/services/database.service';
import { LoggerService } from '../shared/services/logger.service';
import { CountriesService } from '../countries/countries.service';
import { CreateVoteDto } from './dto/create-vote.dto';

type MockDatabaseService = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
  country: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

type MockCountriesService = {
  getCountryByCode: jest.Mock;
};

type MockLoggerService = {
  LogInfo: jest.Mock;
  LogWarning: jest.Mock;
  LogError: jest.Mock;
};

describe('VotesService', () => {
  let service: VotesService;
  let databaseService: MockDatabaseService;
  let countriesService: MockCountriesService;
  let loggerService: MockLoggerService;

  const mockDatabaseService = () => ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    country: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  });

  const mockCountriesService = {
    getCountryByCode: jest.fn(),
  };

  const mockLoggerService = {
    LogInfo: jest.fn(),
    LogWarning: jest.fn(),
    LogError: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VotesService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService(),
        },
        {
          provide: CountriesService,
          useValue: mockCountriesService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<VotesService>(VotesService);
    databaseService = module.get(DatabaseService);
    countriesService = module.get(CountriesService);
    loggerService = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitVote', () => {
    const createVoteDto: CreateVoteDto = {
      name: 'John Doe',
      email: 'john@example.com',
      country: 'ARG',
    };

    const mockCountryData = {
      name: { common: 'Argentina', official: 'Argentine Republic' },
      cca3: 'ARG',
      capital: ['Buenos Aires'],
      region: 'Americas',
      subregion: 'South America',
    };

    const mockCountryDb = {
      id: 1,
      code: 'ARG',
      name: 'Argentina',
      capital: 'Buenos Aires',
      region: 'Americas',
      subRegion: 'South America',
      votes: 5,
    };

    it('should successfully submit a vote for a new user and existing country', async () => {
      databaseService.user.findUnique.mockResolvedValue(null);
      countriesService.getCountryByCode.mockResolvedValue(mockCountryData);
      databaseService.country.findUnique.mockResolvedValue(mockCountryDb);
      databaseService.$transaction.mockResolvedValue([{}, {}]);

      await service.submitVote(createVoteDto);

      expect(databaseService.user.findUnique).toHaveBeenCalledWith({
        where: { email: createVoteDto.email },
      });
      expect(countriesService.getCountryByCode).toHaveBeenCalledWith('ARG');
      expect(databaseService.country.findUnique).toHaveBeenCalledWith({
        where: { code: 'ARG' },
      });
      expect(databaseService.$transaction).toHaveBeenCalled();
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        expect.stringContaining('Vote successfully submitted'),
      );
    });

    it('should successfully submit a vote and create a new country', async () => {
      databaseService.user.findUnique.mockResolvedValue(null);
      countriesService.getCountryByCode.mockResolvedValue(mockCountryData);
      databaseService.country.findUnique.mockResolvedValue(null);
      databaseService.country.create.mockResolvedValue(mockCountryDb);
      databaseService.$transaction.mockResolvedValue([{}, {}]);

      await service.submitVote(createVoteDto);

      expect(databaseService.country.create).toHaveBeenCalledWith({
        data: {
          code: 'ARG',
          name: 'Argentina',
          capital: 'Buenos Aires',
          region: 'Americas',
          subRegion: 'South America',
          votes: 0,
        },
      });
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        expect.stringContaining('Creating new country in database'),
      );
    });

    it('should throw ConflictException if user already voted', async () => {
      const existingUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        countryId: 1,
      };
      databaseService.user.findUnique.mockResolvedValue(existingUser);

      await expect(service.submitVote(createVoteDto)).rejects.toThrow(
        ConflictException,
      );
      expect(loggerService.LogWarning).toHaveBeenCalledWith(
        expect.stringContaining('Vote rejected - duplicate email'),
      );
      expect(countriesService.getCountryByCode).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if country code is invalid', async () => {
      databaseService.user.findUnique.mockResolvedValue(null);
      countriesService.getCountryByCode.mockResolvedValue(null);

      await expect(service.submitVote(createVoteDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(loggerService.LogError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid country code provided'),
        400,
      );
      expect(databaseService.country.findUnique).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      databaseService.user.findUnique.mockResolvedValue(null);
      countriesService.getCountryByCode.mockResolvedValue(mockCountryData);
      databaseService.country.findUnique.mockResolvedValue(mockCountryDb);
      databaseService.$transaction.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.submitVote(createVoteDto)).rejects.toThrow(
        'Database error',
      );
      expect(loggerService.LogError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to submit vote'),
        500,
      );
    });

    it('should handle country with no capital', async () => {
      const countryDataNoCapital = {
        ...mockCountryData,
        capital: undefined,
      };
      databaseService.user.findUnique.mockResolvedValue(null);
      countriesService.getCountryByCode.mockResolvedValue(countryDataNoCapital);
      databaseService.country.findUnique.mockResolvedValue(null);
      databaseService.country.create.mockResolvedValue(mockCountryDb);
      databaseService.$transaction.mockResolvedValue([{}, {}]);

      await service.submitVote(createVoteDto);

      expect(databaseService.country.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          capital: 'N/A',
        }),
      });
    });
  });

  describe('getTopCountries', () => {
    const mockCountries = [
      {
        id: 1,
        code: 'ARG',
        name: 'Argentina',
        capital: 'Buenos Aires',
        region: 'Americas',
        subRegion: 'South America',
        votes: 100,
      },
      {
        id: 2,
        code: 'BRA',
        name: 'Brazil',
        capital: 'Brasília',
        region: 'Americas',
        subRegion: 'South America',
        votes: 95,
      },
      {
        id: 3,
        code: 'USA',
        name: 'United States',
        capital: 'Washington, D.C.',
        region: 'Americas',
        subRegion: 'North America',
        votes: 90,
      },
    ];

    it('should return top countries with votes', async () => {
      databaseService.country.findMany.mockResolvedValue(mockCountries);

      const result = await service.getTopCountries();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        country: 'Argentina',
        capital: 'Buenos Aires',
        region: 'Americas',
        subRegion: 'South America',
        votes: 100,
        rank: 1,
      });
      expect(result[1].rank).toBe(2);
      expect(result[2].rank).toBe(3);
      expect(databaseService.country.findMany).toHaveBeenCalledWith({
        where: { votes: { gt: 0 } },
        orderBy: { votes: 'desc' },
        take: 10,
      });
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Fetching top 10 countries',
      );
    });

    it('should return empty array if no countries have votes', async () => {
      databaseService.country.findMany.mockResolvedValue([]);

      const result = await service.getTopCountries();

      expect(result).toEqual([]);
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Retrieved 0 countries with votes',
      );
    });

    it('should handle countries with null capital', async () => {
      const countriesWithNullCapital = [
        {
          ...mockCountries[0],
          capital: null,
        },
      ];
      databaseService.country.findMany.mockResolvedValue(
        countriesWithNullCapital,
      );

      const result = await service.getTopCountries();

      expect(result[0].capital).toBe('N/A');
    });

    it('should handle database errors', async () => {
      databaseService.country.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getTopCountries()).rejects.toThrow('Database error');
      expect(loggerService.LogError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch top countries'),
        500,
      );
    });
  });

  describe('searchCountries', () => {
    const mockCountries = [
      {
        id: 1,
        code: 'ARG',
        name: 'Argentina',
        capital: 'Buenos Aires',
        region: 'Americas',
        subRegion: 'South America',
        votes: 100,
      },
    ];

    it('should search countries by name', async () => {
      databaseService.country.findMany.mockResolvedValue(mockCountries);

      const result = await service.searchCountries('Arg');

      expect(result).toHaveLength(1);
      expect(result[0].country).toBe('Argentina');
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Searching countries with query: "Arg"',
      );
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Search for "Arg" returned 1 results',
      );
    });

    it('should return top countries if query is empty', async () => {
      databaseService.country.findMany.mockResolvedValue(mockCountries);

      const result = await service.searchCountries('');

      expect(result).toHaveLength(1);
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Empty search query, returning top countries',
      );
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Fetching top 10 countries',
      );
    });

    it('should return top countries if query is whitespace', async () => {
      databaseService.country.findMany.mockResolvedValue(mockCountries);

      const result = await service.searchCountries('   ');

      expect(result).toHaveLength(1);
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Empty search query, returning top countries',
      );
    });

    it('should search countries case-insensitively', async () => {
      databaseService.country.findMany.mockResolvedValue(mockCountries);

      await service.searchCountries('argentina');

      expect(databaseService.country.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({
                    name: {
                      contains: 'argentina',
                      mode: 'insensitive',
                    },
                  }),
                ]),
              }),
            ]),
          }),
        }),
      );
    });

    it('should handle database errors', async () => {
      databaseService.country.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.searchCountries('test')).rejects.toThrow(
        'Database error',
      );
      expect(loggerService.LogError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to search countries'),
        500,
      );
    });

    it('should return empty array if no matches found', async () => {
      databaseService.country.findMany.mockResolvedValue([]);

      const result = await service.searchCountries('xyz');

      expect(result).toEqual([]);
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Search for "xyz" returned 0 results',
      );
    });
  });
});
