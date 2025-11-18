import { Test, TestingModule } from '@nestjs/testing';
import { CountriesService, RestCountry } from './countries.service';
import { LoggerService } from '../shared/services/logger.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

type MockLoggerService = {
  LogInfo: jest.Mock;
  LogWarning: jest.Mock;
  LogError: jest.Mock;
};

describe('CountriesService', () => {
  let service: CountriesService;
  let loggerService: MockLoggerService;

  const mockLoggerService = {
    LogInfo: jest.fn(),
    LogWarning: jest.fn(),
    LogError: jest.fn(),
  };

  const mockCountriesData: RestCountry[] = [
    {
      name: {
        common: 'Argentina',
        official: 'Argentine Republic',
      },
      cca3: 'ARG',
      capital: ['Buenos Aires'],
      region: 'Americas',
      subregion: 'South America',
    },
    {
      name: {
        common: 'Brazil',
        official: 'Federative Republic of Brazil',
      },
      cca3: 'BRA',
      capital: ['Brasília'],
      region: 'Americas',
      subregion: 'South America',
    },
    {
      name: {
        common: 'United States',
        official: 'United States of America',
      },
      cca3: 'USA',
      capital: ['Washington, D.C.'],
      region: 'Americas',
      subregion: 'North America',
    },
  ];

  beforeEach(async () => {
    process.env.RESTCOUNTRIES_API_URL = 'https://restcountries.com/v3.1';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountriesService,
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<CountriesService>(CountriesService);
    loggerService = module.get(LoggerService);

    // Reset cache before each test
    (service as any).countriesCache = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllCountries', () => {
    it('should fetch countries from API on first call', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockCountriesData });

      const result = await service.getAllCountries();

      expect(result).toEqual(mockCountriesData);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://restcountries.com/v3.1/all?fields=name,cca3,capital,region,subregion',
      );
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Fetching countries from REST Countries API...',
      );
      expect(loggerService.LogInfo).toHaveBeenCalledWith('Fetched 3 countries');
    });

    it('should return cached countries on subsequent calls', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockCountriesData });

      // First call
      await service.getAllCountries();
      jest.clearAllMocks();

      // Second call
      const result = await service.getAllCountries();

      expect(result).toEqual(mockCountriesData);
      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Returning cached countries',
      );
    });

    it('should handle API errors', async () => {
      const error = new Error('Network error');
      mockedAxios.get.mockRejectedValue(error);

      await expect(service.getAllCountries()).rejects.toThrow(
        'Failed to fetch countries',
      );
      expect(loggerService.LogError).toHaveBeenCalledWith(
        'Failed to fetch countries from API: Network error',
        500,
      );
    });

    it('should fetch countries with correct query parameters', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockCountriesData });

      await service.getAllCountries();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('fields=name,cca3,capital,region,subregion'),
      );
    });
  });

  describe('getCountryByCode', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockCountriesData });
    });

    it('should return country when valid code is provided', async () => {
      const result = await service.getCountryByCode('ARG');

      expect(result).toEqual(mockCountriesData[0]);
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Looking up country by code: ARG',
      );
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Found country: Argentina (ARG)',
      );
    });

    it('should return null when invalid code is provided', async () => {
      const result = await service.getCountryByCode('XYZ');

      expect(result).toBeNull();
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Looking up country by code: XYZ',
      );
      expect(loggerService.LogWarning).toHaveBeenCalledWith(
        'Country not found for code: XYZ',
      );
    });

    it('should be case-sensitive', async () => {
      const result = await service.getCountryByCode('arg');

      expect(result).toBeNull();
      expect(loggerService.LogWarning).toHaveBeenCalledWith(
        'Country not found for code: arg',
      );
    });

    it('should call getAllCountries to fetch data', async () => {
      const getAllCountriesSpy = jest.spyOn(service, 'getAllCountries');

      await service.getCountryByCode('ARG');

      expect(getAllCountriesSpy).toHaveBeenCalled();
    });

    it('should use cached data on subsequent calls', async () => {
      // First call to populate cache
      await service.getAllCountries();
      jest.clearAllMocks();

      // Second call should use cache
      await service.getCountryByCode('BRA');

      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Returning cached countries',
      );
    });
  });

  describe('getCountriesByCodes', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockCountriesData });
    });

    it('should return map of countries for valid codes', async () => {
      const codes = ['ARG', 'BRA', 'USA'];
      const result = await service.getCountriesByCodes(codes);

      expect(result.size).toBe(3);
      expect(result.get('ARG')).toEqual(mockCountriesData[0]);
      expect(result.get('BRA')).toEqual(mockCountriesData[1]);
      expect(result.get('USA')).toEqual(mockCountriesData[2]);
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Looking up 3 countries by codes: ARG, BRA, USA',
      );
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Found 3 out of 3 requested countries',
      );
    });

    it('should return partial map when some codes are invalid', async () => {
      const codes = ['ARG', 'XYZ', 'BRA'];
      const result = await service.getCountriesByCodes(codes);

      expect(result.size).toBe(2);
      expect(result.get('ARG')).toEqual(mockCountriesData[0]);
      expect(result.get('BRA')).toEqual(mockCountriesData[1]);
      expect(result.get('XYZ')).toBeUndefined();
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Found 2 out of 3 requested countries',
      );
    });

    it('should return empty map when all codes are invalid', async () => {
      const codes = ['XYZ', 'ABC'];
      const result = await service.getCountriesByCodes(codes);

      expect(result.size).toBe(0);
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Found 0 out of 2 requested countries',
      );
    });

    it('should return empty map when empty array is provided', async () => {
      const codes: string[] = [];
      const result = await service.getCountriesByCodes(codes);

      expect(result.size).toBe(0);
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Looking up 0 countries by codes: ',
      );
    });

    it('should call getAllCountries to fetch data', async () => {
      const getAllCountriesSpy = jest.spyOn(service, 'getAllCountries');

      await service.getCountriesByCodes(['ARG', 'BRA']);

      expect(getAllCountriesSpy).toHaveBeenCalled();
    });

    it('should handle duplicate codes correctly', async () => {
      const codes = ['ARG', 'ARG', 'BRA'];
      const result = await service.getCountriesByCodes(codes);

      expect(result.size).toBe(2);
      expect(result.get('ARG')).toEqual(mockCountriesData[0]);
    });

    it('should use cached data on subsequent calls', async () => {
      // First call to populate cache
      await service.getAllCountries();
      jest.clearAllMocks();

      // Second call should use cache
      await service.getCountriesByCodes(['ARG', 'BRA']);

      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(loggerService.LogInfo).toHaveBeenCalledWith(
        'Returning cached countries',
      );
    });
  });

  describe('cache behavior', () => {
    it('should maintain cache across different method calls', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockCountriesData });

      // First method call
      await service.getAllCountries();
      jest.clearAllMocks();

      // Second method should use cache
      await service.getCountryByCode('ARG');

      // Third method should also use cache
      await service.getCountriesByCodes(['BRA', 'USA']);

      // API should only be called once
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should not cache on API error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getAllCountries()).rejects.toThrow(
        'Failed to fetch countries',
      );

      // Cache should still be null
      expect((service as any).countriesCache).toBeNull();

      // Clear mock to reset call count
      jest.clearAllMocks();

      // Next call should try API again
      mockedAxios.get.mockResolvedValue({ data: mockCountriesData });
      await service.getAllCountries();

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle countries without capital', async () => {
      const countriesWithoutCapital: RestCountry[] = [
        {
          name: { common: 'Country', official: 'Official Country' },
          cca3: 'CTR',
          capital: undefined,
          region: 'Region',
          subregion: undefined,
        },
      ];
      mockedAxios.get.mockResolvedValue({ data: countriesWithoutCapital });

      const result = await service.getAllCountries();

      expect(result[0].capital).toBeUndefined();
    });

    it('should handle empty response from API', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      const result = await service.getAllCountries();

      expect(result).toEqual([]);
      expect(loggerService.LogInfo).toHaveBeenCalledWith('Fetched 0 countries');
    });
  });
});
