import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

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
  private readonly logger = new Logger(CountriesService.name);
  private countriesCache: RestCountry[] | null = null;
  private readonly apiUrl = process.env.RESTCOUNTRIES_API_URL;

  async getAllCountries(): Promise<RestCountry[]> {
    if (this.countriesCache) {
      return this.countriesCache;
    }

    try {
      this.logger.log('Fetching countries from REST Countries API...');
      const response = await axios.get<RestCountry[]>(
        `${this.apiUrl}/all?fields=name,cca3,capital,region,subregion`,
      );

      this.countriesCache = response.data;
      this.logger.log(`Fetched ${this.countriesCache.length} countries`);

      return this.countriesCache;
    } catch (error) {
      this.logger.error('Failed to fetch countries from API', error);
      throw new Error('Failed to fetch countries');
    }
  }

  async getCountryByCode(code: string): Promise<RestCountry | null> {
    const countries = await this.getAllCountries();
    return countries.find((c) => c.cca3 === code) || null;
  }

  async getCountriesByCodes(
    codes: string[],
  ): Promise<Map<string, RestCountry>> {
    const countries = await this.getAllCountries();
    const countryMap = new Map<string, RestCountry>();

    countries.forEach((country) => {
      if (codes.includes(country.cca3)) {
        countryMap.set(country.cca3, country);
      }
    });

    return countryMap;
  }
}
