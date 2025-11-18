# Backend Design Decisions

This document explains the architectural and technical decisions made for the CountryVote backend service.

## Architecture Overview

The backend follows **NestJS modular architecture** with clear separation of concerns:

```
src/
├── prisma/       - Database access layer
├── countries/    - Country data management
├── votes/        - Voting logic
├── app.module.ts - Root module
└── main.ts       - Application bootstrap
```

## Key Design Decisions

### 1. Framework: NestJS

**Decision:** Use NestJS as the backend framework

**Reasoning:**
- **Type Safety**: First-class TypeScript support aligns with requirements
- **Modular Architecture**: Built-in dependency injection and module system
- **Scalability**: Production-ready with excellent tooling
- **Developer Experience**: CLI tools, decorators, and clear patterns
- **Industry Standard**: Widely adopted in enterprise applications

**Trade-offs:**
- ✅ Structured and maintainable code
- ✅ Easy to test with built-in testing utilities
- ❌ Slightly more boilerplate than Express
- ❌ Learning curve for developers new to DI patterns

### 2. Database: PostgreSQL with Prisma ORM

**Decision:** Use PostgreSQL as the database and Prisma as the ORM

**Reasoning for PostgreSQL:**
- **ACID Compliance**: Ensures data integrity for vote counting
- **Relational Data**: Natural fit for User-Country relationships
- **Performance**: Excellent for read-heavy workloads (leaderboards)
- **Constraints**: Email uniqueness enforced at database level
- **JSON Support**: Can store additional metadata if needed

**Reasoning for Prisma:**
- **Type Safety**: Auto-generated TypeScript types from schema
- **Migration System**: Easy schema versioning and deployment
- **Developer Experience**: Intuitive query API
- **Performance**: Efficient query generation

**Trade-offs:**
- ✅ Strong consistency guarantees
- ✅ Reliable and battle-tested
- ✅ Great tooling (Prisma Studio)
- ❌ Requires running a database server
- ❌ Not as flexible as NoSQL for schema changes

**Alternative Considered:** MongoDB
- Would allow faster prototyping
- Less strict schema
- Rejected due to: Need for transactions, vote counting integrity, relational data model

### 3. Data Model Design

**Schema:**
```prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique  // Enforces "one vote per email"
  countryId String              // Foreign key to Country
  country   Country  @relation(...)
  createdAt DateTime
}

model Country {
  id           String   @id @default(uuid())
  name         String
  officialName String
  code         String   @unique  // cca3 from REST Countries
  capital      String?
  region       String
  subRegion    String
  votes        Int      @default(0)  // Denormalized count
  users        User[]
  createdAt    DateTime
  updatedAt    DateTime
}
```

**Key Decisions:**

#### A. One-to-Many Relationship (User → Country)
- One Country can have many Users
- One User can vote for one Country
- Prevents users from voting for multiple countries

#### B. Email Uniqueness Constraint
- `@unique` on User.email enforces "one vote per email" at database level
- Attempt to insert duplicate email throws error
- Cannot be bypassed by application bugs

#### C. Denormalized Vote Count
- `votes` field on Country table stores the count
- Updated via transaction when user votes
- **Alternative:** Calculate votes with `COUNT(*)` on Users table

**Why Denormalized?**
- ✅ Faster reads (leaderboard queries)
- ✅ No JOINs needed for top countries
- ✅ Simpler queries
- ❌ Potential for inconsistency
- ❌ Requires transaction to keep in sync

**Mitigation:** Use database transactions to ensure atomicity

#### D. Store Full Country Details
- Store REST Countries API data in database
- Reduces external API dependency
- Allows queries to work even if external API is down

**Why Store vs Fetch on Demand?**
- ✅ Faster response times
- ✅ Resilience to external API failures
- ✅ Consistent data (countries don't change often)
- ❌ Stale data (but country data is stable)
- ❌ Database storage overhead (minimal)

### 4. External API Integration: REST Countries

**Decision:** Cache REST Countries API responses in memory

**Implementation:**
```typescript
private countriesCache: RestCountry[] | null = null;

async getAllCountries() {
  if (this.countriesCache) {
    return this.countriesCache;
  }
  // Fetch and cache...
}
```

**Reasoning:**
- Country data is static (rarely changes)
- Reduces API calls from O(n) to O(1) after first request
- Improves response times
- No external dependency for subsequent requests

**Trade-offs:**
- ✅ Fast lookups
- ✅ Reduces external API load
- ✅ Simple implementation
- ❌ Cache never expires (acceptable for country data)
- ❌ Lost on application restart (acceptable)
- ❌ Not shared across instances

**Alternative for Production:** Redis
- Distributed cache
- Persists across restarts
- Shared by all instances
- Configurable TTL
- **Not implemented due to time constraints**

### 5. Validation Strategy

**Decision:** Use `class-validator` with DTOs

**Implementation:**
```typescript
export class CreateVoteDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  country: string;
}
```

**Reasoning:**
- **Type Safety**: DTOs are TypeScript classes
- **Declarative**: Validation rules as decorators
- **Automatic**: ValidationPipe validates on every request
- **Clear Errors**: Returns detailed error messages

**Trade-offs:**
- ✅ Clean and readable
- ✅ Reusable validation rules
- ✅ Automatic error responses
- ❌ Slightly verbose for simple cases

### 6. Transaction Management

**Decision:** Use Prisma transactions for vote submission

**Implementation:**
```typescript
await this.prisma.$transaction([
  this.prisma.user.create({ ... }),
  this.prisma.country.update({
    data: { votes: { increment: 1 } }
  })
]);
```

**Reasoning:**
- **Atomicity**: Both operations succeed or both fail
- **Consistency**: Vote count always matches user count
- **Isolation**: Concurrent votes don't cause race conditions

**Why Needed:**
- Creating user and incrementing votes must be atomic
- Without transaction, user could be created but vote not counted
- Prevents data corruption

### 7. Error Handling Strategy

**Decision:** Use NestJS exception filters with HTTP status codes

**Implementation:**
```typescript
if (existingUser) {
  throw new ConflictException('Email already used');
}

if (!countryData) {
  throw new BadRequestException('Invalid country code');
}
```

**HTTP Status Codes:**
- `201 Created` - Vote submitted successfully
- `400 Bad Request` - Invalid input (validation failed)
- `409 Conflict` - Email already used
- `404 Not Found` - Country not found
- `500 Internal Server Error` - Unexpected errors

**Trade-offs:**
- ✅ Standard HTTP semantics
- ✅ Clear error messages
- ✅ Easy for frontend to handle
- ❌ Limited error detail (acceptable for MVP)

### 8. API Design

**Decision:** RESTful API with `/api` prefix

**Endpoints:**
```
GET    /api/countries        - List all countries
POST   /api/votes            - Submit vote
GET    /api/votes/top        - Get top 10 countries
GET    /api/votes/search?q=  - Search countries
```

**Reasoning:**
- **RESTful**: Standard conventions
- **Clear**: Resource-based URLs
- **Versioned**: `/api` allows future versioning (`/api/v2`)
- **Predictable**: Follows HTTP method semantics

**Response Format:**
```json
{
  "data": [...],
  "message": "..."  // Optional
}
```

**Why Wrapper Object?**
- ✅ Consistent response format
- ✅ Allows adding metadata (pagination, etc.)
- ✅ Forward compatible

### 9. CORS Configuration

**Decision:** Enable CORS for local development

**Implementation:**
```typescript
app.enableCors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
});
```

**Reasoning:**
- Frontend and backend on different ports in development
- `credentials: true` allows cookies (if needed later)
- Restricted origins for security

**Production Consideration:**
- Should use environment variables for allowed origins
- Consider API gateway for centralized CORS

### 10. Environment Configuration

**Decision:** Use `@nestjs/config` with `.env` file

**Reasoning:**
- **12-Factor App**: Configuration via environment variables
- **Type Safety**: Can validate env vars
- **Flexibility**: Different configs per environment

**Variables:**
```env
DATABASE_URL          - Database connection
PORT                  - Server port
RESTCOUNTRIES_API_URL - External API URL
```

## Functional Requirements Compliance

### Requirement 1: Create user with favorite country

✅ **Implementation:**
- `POST /api/votes` endpoint
- Creates User record with name, email, country
- Links user to country via foreign key
- Validates country code exists in REST Countries API

✅ **One vote per email:**
- Email has `@unique` constraint in database
- Duplicate email throws `ConflictException`
- Enforced at database level (cannot be bypassed)

### Requirement 2: Retrieve top 10 countries with details

✅ **Implementation:**
- `GET /api/votes/top` endpoint
- Returns countries sorted by vote count
- Includes: name, official name, capital, region, sub-region
- Data from REST Countries API stored in database

✅ **Data enrichment:**
- Country details fetched from REST Countries API on first vote
- Stored in database for fast subsequent queries
- Includes all required fields from challenge

## Non-Functional Requirements

### Performance

1. **Database Indexing**
   - `@unique` on email creates index
   - `@unique` on country code creates index
   - Fast lookups for vote validation

2. **Caching**
   - REST Countries API responses cached
   - Reduces latency and external dependencies

3. **Efficient Queries**
   - No N+1 queries
   - Denormalized vote count avoids JOINs
   - Top 10 query is O(n log n) with LIMIT

### Scalability

**Current Limitations:**
- Single database instance
- In-memory cache (not distributed)
- No horizontal scaling considerations

**Production Improvements:**
- Read replicas for leaderboard queries
- Redis for distributed caching
- Queue system for vote processing
- Rate limiting per IP/email

### Security

**Current Measures:**
- Input validation (class-validator)
- SQL injection prevented (Prisma parameterized queries)
- CORS configured
- Email uniqueness enforced

**Production Improvements:**
- Rate limiting
- CAPTCHA for vote submission
- API authentication
- Request signing
- Audit logging

### Maintainability

- **Modular Architecture**: Easy to add features
- **Type Safety**: Catches errors at compile time
- **Clear Separation**: Each module has single responsibility
- **Documentation**: Code comments and README

## Trade-offs Made

### Due to Time Constraints

1. **No Authentication**
   - Current: Email-based identification only
   - Production: OAuth, JWT, user accounts

2. **Simple Caching**
   - Current: In-memory cache
   - Production: Redis with TTL

3. **No Rate Limiting**
   - Current: Unlimited requests
   - Production: Rate limiting by IP/email

4. **Basic Error Handling**
   - Current: Generic error messages
   - Production: Detailed error codes, logging

5. **No Tests**
   - Current: Manual testing only
   - Production: Unit, integration, E2E tests

6. **No Logging**
   - Current: Console.log only
   - Production: Structured logging (Winston)

7. **No Monitoring**
   - Current: No health checks
   - Production: Prometheus, Grafana, alerts

### Design Trade-offs (Intentional)

1. **Denormalized Vote Count**
   - Chose: Speed over strict normalization
   - Acceptable: Votes are append-only

2. **In-Memory Cache**
   - Chose: Simplicity over distribution
   - Acceptable: Country data is static

3. **Store Country Data**
   - Chose: Redundancy over minimal storage
   - Acceptable: Improves resilience

## Assumptions Made

1. **Country Data Stability**
   - Countries rarely change
   - REST Countries API is reliable
   - No need for real-time updates

2. **Vote Immutability**
   - Users cannot change their vote
   - Users cannot delete their vote
   - Votes are permanent

3. **Scale**
   - Moderate traffic expected
   - Single region deployment
   - No need for CDN

4. **Email Validation**
   - Email format validation sufficient
   - No email verification required
   - Trust user-provided emails

5. **Country Code**
   - Use cca3 (3-letter code) from REST Countries
   - Unique identifier for countries
   - Never changes

## Future Enhancements

1. **Features**
   - User accounts and authentication
   - Vote history
   - Country filtering (by region, etc.)
   - Voting statistics and analytics
   - Export data (CSV, JSON)

2. **Technical**
   - GraphQL API option
   - WebSocket for real-time updates
   - Background jobs for vote processing
   - Elasticsearch for advanced search
   - Database read replicas

3. **Operations**
   - CI/CD pipeline
   - Docker deployment
   - Kubernetes orchestration
   - Automated backups
   - Monitoring and alerting

## Conclusion

The backend is designed to be:
- ✅ **Reliable**: ACID transactions, validation, error handling
- ✅ **Performant**: Caching, denormalization, efficient queries
- ✅ **Maintainable**: Modular, typed, documented
- ✅ **Scalable**: Architecture supports future growth

The design prioritizes correctness and developer experience while being pragmatic about time constraints. All functional requirements are met, and the architecture provides a solid foundation for future enhancements.

