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

`GET /board` reads all boards, ordered columns, and tasks from MySQL.
`POST /board` writes a board and its columns to MySQL in a transaction.
`PATCH /board/:boardId` updates a board title.
`PATCH /tasks/:taskId` updates a task's name, details, due date, and column.
`GET /board/:boardId/tasks` reads tasks for one board, and
`POST /board/:boardId/tasks` creates a task in one of that board's columns.
`PATCH /tasks/:taskId/status` updates a task's column. `DELETE /tasks/:taskId`
deletes a task, and `DELETE /board/:boardId` deletes a board and its tasks.
`PATCH /tasks/:taskId/blocked` toggles a task's blocked flag.

The home page links to each saved board at `/board/:boardId`. Board pages
display their columns and tasks; columns can be scrolled horizontally when they
extend beyond the viewport.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/board` | Read all boards, columns, and tasks |
| `POST` | `/board` | Create a board and its columns |
| `PATCH` | `/board/:boardId` | Update a board title |
| `DELETE` | `/board/:boardId` | Delete a board and its tasks |
| `GET` | `/board/:boardId/tasks` | Read tasks for a board |
| `POST` | `/board/:boardId/tasks` | Create a task on a board |
| `PATCH` | `/tasks/:taskId` | Update task details and column |
| `PATCH` | `/tasks/:taskId/status` | Move a task to another column |
| `PATCH` | `/tasks/:taskId/blocked` | Set a task's blocked flag |
| `DELETE` | `/tasks/:taskId` | Delete a task |

Send a JSON request to create a board. If `columns` is omitted, the default
To-do, In progress, and Done columns are created.

```json
{
  "title": "Home projects",
  "columns": ["To-do", "In progress", "Done"]
}
```

Task creation accepts `name`, optional `details`, optional `dueDate` in
`YYYY-MM-DD` format, and the selected `columnId`.

Changing a task's status accepts the destination `columnId`.
Updating a task accepts its `name`, optional `details`, optional `dueDate`, and
destination `columnId`. Board updates accept a new `title`.
Blocked status updates accept `isBlocked` as a boolean. Due dates within three
days are highlighted purple; overdue dates are highlighted red unless the task
is in a `done`, `completed`, or `complete` column.
