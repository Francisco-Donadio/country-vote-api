import { Controller, Get } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { CountryDto } from './dto/country.dto';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  async getAllCountries(): Promise<{ data: CountryDto[] }> {
    const countries = await this.countriesService.getAllCountries();

    // Transform to simple DTO for dropdown
    const data = countries
      .map((country) => ({
        name: country.name.common,
        code: country.cca3,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { data };
  }
}
