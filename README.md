# Progress App

Progress App is a React and Vite frontend with an Express API skeleton.

## Development

Install dependencies with `npm install`. Fill in the MySQL connection settings
in the ignored project-root `.env` file, then start the API and frontend in
separate terminals:

```sh
npm run server
npm run dev
```

The Express API listens on port `3001` by default. Set the `PORT` environment
variable to use another port. Vite proxies `/board` and `/tasks` requests to the
API server. The database must have the tables defined in
[`database/schema.sql`](./database/schema.sql).

## API routes

`POST /board` is implemented and writes the board and its columns to MySQL in a
transaction. The other routes are stubs and respond with HTTP `501 Not
Implemented`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/board` | Read the board |
| `POST` | `/board` | Create a board and its columns |
| `POST` | `/board/:boardId/tasks` | Create a task on a board |
| `PATCH` | `/tasks/:taskId/status` | Change a task's column/status |
| `DELETE` | `/tasks/:taskId` | Remove a task |

Send a JSON request to create a board. If `columns` is omitted, the default
To-do, In progress, and Done columns are created.

```json
{
  "title": "Home projects",
  "columns": ["To-do", "In progress", "Done"]
}
```
