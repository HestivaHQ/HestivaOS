# Maintenance Marshall Operating System  

Stage 1 foundation scaffold. 

## Prerequisites

- Node.js 22+
- npm 10+
- PostgreSQL 16+

## Start locally

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Web: http://localhost:3000
API health: http://localhost:4000/api/v1/health
