import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface RestCountry {
  name: {
    common: string;
    official: string;
  };
  cca3: string;
  capital?: string[];
  region: string;
  subregion?: string;
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.user.deleteMany({});
  await prisma.country.deleteMany({});
  console.log('✅ Existing data cleared\n');

  // Fetch country data from REST Countries API
  console.log('🌍 Fetching country data from REST Countries API...');
  const response = await axios.get<RestCountry[]>(
    'https://restcountries.com/v3.1/all?fields=name,cca3,capital,region,subregion',
  );
  const allCountries = response.data;
  console.log(`✅ Fetched ${allCountries.length} countries\n`);

  // Select specific countries to seed with votes
  const popularCountryCodes = [
    'ARG', // Argentina
    'BRA', // Brazil
    'USA', // United States
    'CAN', // Canada
    'MEX', // Mexico
    'FRA', // France
    'DEU', // Germany
    'ESP', // Spain
    'ITA', // Italy
    'GBR', // United Kingdom
    'JPN', // Japan
    'AUS', // Australia
    'IND', // India
    'CHN', // China
    'ZAF', // South Africa
  ];

  // Create countries with initial vote counts
  console.log('🏳️  Creating countries...');
  const createdCountries = [];

  for (const countryCode of popularCountryCodes) {
    const countryData = allCountries.find((c) => c.cca3 === countryCode);

    if (countryData) {
      const country = await prisma.country.create({
        data: {
          code: countryData.cca3,
          name: countryData.name.common,
          capital: countryData.capital?.[0] || 'N/A',
          region: countryData.region,
          subRegion: countryData.subregion || 'N/A',
          votes: 0, // Will be updated as we create users
        },
      });
      createdCountries.push(country);
      console.log(`  ✓ Created country: ${country.name} (${country.code})`);
    }
  }
  console.log(`✅ Created ${createdCountries.length} countries\n`);

  // Create users with votes
  console.log('👥 Creating users and votes...');

  const users = [
    { name: 'Alice Johnson', email: 'alice@example.com', countryCode: 'ARG' },
    { name: 'Bob Smith', email: 'bob@example.com', countryCode: 'ARG' },
    { name: 'Charlie Brown', email: 'charlie@example.com', countryCode: 'ARG' },
    { name: 'Diana Prince', email: 'diana@example.com', countryCode: 'BRA' },
    { name: 'Ethan Hunt', email: 'ethan@example.com', countryCode: 'BRA' },
    { name: 'Fiona Green', email: 'fiona@example.com', countryCode: 'BRA' },
    { name: 'George Wilson', email: 'george@example.com', countryCode: 'BRA' },
    { name: 'Hannah Lee', email: 'hannah@example.com', countryCode: 'USA' },
    { name: 'Isaac Newton', email: 'isaac@example.com', countryCode: 'USA' },
    { name: 'Julia Roberts', email: 'julia@example.com', countryCode: 'USA' },
    { name: 'Kevin Hart', email: 'kevin@example.com', countryCode: 'USA' },
    { name: 'Laura Palmer', email: 'laura@example.com', countryCode: 'USA' },
    { name: 'Michael Scott', email: 'michael@example.com', countryCode: 'CAN' },
    { name: 'Nina Simone', email: 'nina@example.com', countryCode: 'CAN' },
    { name: 'Oscar Wilde', email: 'oscar@example.com', countryCode: 'CAN' },
    {
      name: 'Patricia Hill',
      email: 'patricia@example.com',
      countryCode: 'MEX',
    },
    { name: 'Quinn Fabray', email: 'quinn@example.com', countryCode: 'MEX' },
    { name: 'Rachel Green', email: 'rachel@example.com', countryCode: 'FRA' },
    { name: 'Steve Rogers', email: 'steve@example.com', countryCode: 'FRA' },
    { name: 'Tina Fey', email: 'tina@example.com', countryCode: 'FRA' },
    { name: 'Uma Thurman', email: 'uma@example.com', countryCode: 'DEU' },
    { name: 'Victor Hugo', email: 'victor@example.com', countryCode: 'DEU' },
    { name: 'Wendy Adams', email: 'wendy@example.com', countryCode: 'ESP' },
    { name: 'Xavier Charles', email: 'xavier@example.com', countryCode: 'ESP' },
    { name: 'Yolanda King', email: 'yolanda@example.com', countryCode: 'ITA' },
    { name: 'Zoe Barnes', email: 'zoe@example.com', countryCode: 'ITA' },
    { name: 'Andrew Taylor', email: 'andrew@example.com', countryCode: 'GBR' },
    { name: 'Bella Swan', email: 'bella@example.com', countryCode: 'GBR' },
    { name: 'Carlos Sainz', email: 'carlos@example.com', countryCode: 'JPN' },
    { name: 'Daisy Johnson', email: 'daisy@example.com', countryCode: 'JPN' },
    { name: 'Edward Cullen', email: 'edward@example.com', countryCode: 'AUS' },
    {
      name: 'Felicity Smoak',
      email: 'felicity@example.com',
      countryCode: 'AUS',
    },
    { name: 'Gary Cooper', email: 'gary@example.com', countryCode: 'IND' },
    { name: 'Holly Woods', email: 'holly@example.com', countryCode: 'IND' },
    { name: 'Ivan Drago', email: 'ivan@example.com', countryCode: 'CHN' },
    { name: 'Jessica Jones', email: 'jessica@example.com', countryCode: 'ZAF' },
  ];

  for (const userData of users) {
    const country = createdCountries.find(
      (c) => c.code === userData.countryCode,
    );

    if (country) {
      await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          countryId: country.id,
        },
      });

      // Increment vote count
      await prisma.country.update({
        where: { id: country.id },
        data: { votes: { increment: 1 } },
      });

      console.log(
        `  ✓ Created user: ${userData.name} voted for ${country.name}`,
      );
    }
  }

  console.log(`✅ Created ${users.length} users with votes\n`);

  // Display final statistics
  console.log('📊 Database Statistics:');
  const totalCountries = await prisma.country.count();
  const totalUsers = await prisma.user.count();
  const countriesWithVotes = await prisma.country.count({
    where: { votes: { gt: 0 } },
  });

  console.log(`  • Total countries: ${totalCountries}`);
  console.log(`  • Countries with votes: ${countriesWithVotes}`);
  console.log(`  • Total users: ${totalUsers}`);
  console.log(`  • Total votes cast: ${totalUsers}\n`);
  console.log('\n✅ Database seeding completed successfully! 🎉\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
