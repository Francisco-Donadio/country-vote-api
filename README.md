# Country Vote API

A RESTful API built with NestJS for managing country voting. Users can submit votes for their favorite countries, view top voted countries, and search through country rankings.

## 🌐 Live Application

**Frontend**: [https://country-vote.onrender.com](https://country-vote.onrender.com)  
**API Base URL**: [https://country-vote-api.onrender.com/api](https://country-vote-api.onrender.com/api)

## 🚀 Features

- **Vote Submission**: One vote per email address
- **Country Rankings**: Get top 10 most voted countries
- **Search Functionality**: Search countries by name, capital, region, or subregion
- **Country Validation**: Integrates with REST Countries API for valid country data
- **Comprehensive Logging**: Custom logger service for monitoring and debugging
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Full unit test coverage with Jest

## 🛠️ Tech Stack

- **Framework**: NestJS v11
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma v6
- **Validation**: class-validator & class-transformer
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **External API**: REST Countries API

## 📋 Prerequisites

- Node.js (v18.19.1+, v20.11.1+, or v22+)
- npm (v8.0.0+)
- PostgreSQL database

## 🔧 Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd country-vote-api
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/country_vote_db"

# REST Countries API
RESTCOUNTRIES_API_URL="https://restcountries.com/v3.1"

# Server
PORT=3000
```

4. **Set up the database**

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed the database with sample data (Optional)
npx prisma db seed
```

The seed script will:

- Create 15 countries (Argentina, Brazil, USA, Canada, Mexico, France, Germany, Spain, Italy, UK, Japan, Australia, India, China, South Africa)
- Create 36 sample users with votes

## 🏃 Running the Application

### Development Mode

```bash
# Watch mode with hot reload
npm run start:dev
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

The API will be available at `http://localhost:3000`

## 📚 API Documentation

### Live API Documentation

Interactive Swagger documentation:

- **Production**: [https://country-vote-api.onrender.com/api-docs](https://country-vote-api.onrender.com/api-docs)
- **Local Development**: `http://localhost:3000/api-docs`

## 🧪 Testing

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

## 🗄️ Database Management

```bash
# Generate Prisma Client
npx prisma generate

# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy

# Seed the database
npx prisma db seed

# Reset the database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio
```

## 📁 Project Structure

```
src/
├── countries/              # Countries module
│   ├── dto/               # Data transfer objects
│   ├── countries.controller.ts
│   ├── countries.service.ts
│   ├── countries.service.spec.ts
│   └── countries.module.ts
├── votes/                 # Votes module
│   ├── dto/              # Data transfer objects
│   ├── votes.controller.ts
│   ├── votes.service.ts
│   ├── votes.service.spec.ts
│   └── votes.module.ts
├── shared/               # Shared module (global)
│   ├── services/
│   │   ├── database.service.ts
│   │   └── logger.service.ts
│   └── shared.module.ts
├── prisma/              # Prisma configuration
│   └── prisma.service.ts
├── app.module.ts        # Root module
└── main.ts              # Application entry point
```

## 🔌 API Endpoints

### Votes

- `POST /api/votes` - Submit a vote for a country
- `GET /api/votes/top` - Get top 10 voted countries
- `GET /api/votes/search?query={text}` - Search countries with votes

### Countries

- `GET /api/countries` - Get all available countries from REST Countries API

## 📝 Example API Usage

### Submit a Vote

**Production:**

```bash
curl -X POST https://country-vote-api.onrender.com/api/votes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "country": "ARG"
  }'
```

**Local:**

```bash
curl -X POST http://localhost:3000/api/votes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "country": "ARG"
  }'
```

### Get Top Countries

**Production:**

```bash
curl https://country-vote-api.onrender.com/api/votes/top
```

**Local:**

```bash
curl http://localhost:3000/api/votes/top
```

### Search Countries

**Production:**

```bash
curl https://country-vote-api.onrender.com/api/votes/search?query=Europe
```

**Local:**

```bash
curl http://localhost:3000/api/votes/search?query=Europe
```

## 🗃️ Database Schema

### User Table

- `id`: Integer (Primary Key)
- `name`: String
- `email`: String (Unique)
- `countryId`: Integer (Foreign Key)

### Country Table

- `id`: Integer (Primary Key)
- `code`: String (Unique, ISO 3166-1 alpha-3)
- `name`: String
- `capital`: String
- `region`: String
- `subRegion`: String
- `votes`: Integer (Default: 0)

## 🔐 Business Rules

1. **One Vote Per Email**: Each email address can only vote once
2. **Valid Countries Only**: Country codes are validated against REST Countries API
3. **Auto-creation**: Countries are automatically created in the database when first voted for
4. **Vote Counting**: Each successful vote increments the country's vote count

## 🐛 Troubleshooting

### Database Connection Issues

If you encounter database connection errors:

1. Ensure PostgreSQL is running
2. Verify DATABASE_URL in `.env` is correct
3. Run `npx prisma db push` to sync the schema

### Port Already in Use

If port 3000 is already in use, change the PORT in your `.env` file:

```env
PORT=3001
```

## 📦 Available Scripts

| Script                | Description                          |
| --------------------- | ------------------------------------ |
| `npm run start`       | Start the application                |
| `npm run start:dev`   | Start in development mode with watch |
| `npm run start:debug` | Start in debug mode                  |
| `npm run start:prod`  | Start in production mode             |
| `npm run build`       | Build the application                |
| `npm run format`      | Format code with Prettier            |
| `npm run lint`        | Lint and fix code with ESLint        |
| `npm test`            | Run unit tests                       |
| `npm run test:watch`  | Run tests in watch mode              |
| `npm run test:cov`    | Run tests with coverage              |
| `npm run test:e2e`    | Run end-to-end tests                 |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is [MIT licensed](LICENSE).

## 👥 Authors

- Francisco Donadio

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - The progressive Node.js framework
- [REST Countries API](https://restcountries.com/) - Country data provider
- [Prisma](https://www.prisma.io/) - Next-generation ORM
