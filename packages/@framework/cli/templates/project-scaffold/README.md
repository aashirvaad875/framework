# APP_NAME_PLACEHOLDER

A REST API built with [@framework/core](https://github.com/your-org/framework).

## Quick Start

```bash
cp .env.example .env   # fill in DB credentials
npm install
npm run dev
```

## Docker

```bash
docker-compose up      # starts app + postgres
```

## API

| Method | Path           | Description  |
| ------ | -------------- | ------------ |
| GET    | /health        | Health check |
| POST   | /api/users     | Create user  |
| GET    | /api/users     | List users   |
| GET    | /api/users/:id | Get user     |
| PUT    | /api/users/:id | Update user  |
| DELETE | /api/users/:id | Delete user  |

## Scripts

| Command         | Description           |
| --------------- | --------------------- |
| `npm run dev`   | Start with hot reload |
| `npm run build` | Compile TypeScript    |
| `npm start`     | Run compiled output   |
| `npm test`      | Run tests             |
| `npm run lint`  | Lint source files     |
