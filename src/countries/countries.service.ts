import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { LoggerService } from 'src/shared/services/logger.service';

export interface RestCountry {
  name: {
    common: string;
    official: string;
  };
  cca3: string;
  capital?: string[];
  region: string;
  subregion?: string;
}

@Injectable()
export class CountriesService {
  private countriesCache: RestCountry[] | null = null;
  private readonly apiUrl = process.env.RESTCOUNTRIES_API_URL;

  constructor(private readonly logger: LoggerService) {}

  async getAllCountries(): Promise<RestCountry[]> {
    if (this.countriesCache) {
      this.logger.LogInfo('Returning cached countries');
      return this.countriesCache;
    }

    try {
      this.logger.LogInfo('Fetching countries from REST Countries API...');
      const response = await axios.get<RestCountry[]>(
        `${this.apiUrl}/all?fields=name,cca3,capital,region,subregion`,
      );

      this.countriesCache = response.data;
      this.logger.LogInfo(`Fetched ${this.countriesCache.length} countries`);

      return this.countriesCache;
    } catch (error) {
      this.logger.LogError(
        `Failed to fetch countries from API: ${error.message}`,
        500,
      );
      throw new Error('Failed to fetch countries');
    }
  }

  async getCountryByCode(code: string): Promise<RestCountry | null> {
    this.logger.LogInfo(`Looking up country by code: ${code}`);
    const countries = await this.getAllCountries();
    const country = countries.find((c) => c.cca3 === code) || null;

    if (country) {
      this.logger.LogInfo(`Found country: ${country.name.common} (${code})`);
    } else {
      this.logger.LogWarning(`Country not found for code: ${code}`);
    }

    return country;
  }

  async getCountriesByCodes(
    codes: string[],
  ): Promise<Map<string, RestCountry>> {
    this.logger.LogInfo(
      `Looking up ${codes.length} countries by codes: ${codes.join(', ')}`,
    );
    const countries = await this.getAllCountries();
    const countryMap = new Map<string, RestCountry>();

    countries.forEach((country) => {
      if (codes.includes(country.cca3)) {
        countryMap.set(country.cca3, country);
      }
    });

    this.logger.LogInfo(
      `Found ${countryMap.size} out of ${codes.length} requested countries`,
    );

    return countryMap;
  }
}
