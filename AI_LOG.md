## First Prompt
# What I asked for:
I;m using my sql backend. Tell me what tables to create and the columns too. Or create a script that does that. I will fill in the password and other.
# What it produced:
Created schema.sql for MySQL. It creates the progress_app database and these tables:
boards: board title and timestamps.
board_columns: board association, customizable column name, and order.
tasks: task name, details, due date, blocked flag, and column_id.
A task’s current status is represented by its column: moving a task means updating its column_id. The script contains no credentials. It has not been run against a MySQL server.
# Fixed or Rejected:
I didn't want the timestamps in the boards table so I rejected it since it seemed out of scope.
# Verification:
Was able to run it and see the new tables and schema.

## Second Prompt
# What I asked for:
It is now time to create the apis. It should only have the skeleton(routes stubbed). These are the ones I think it needs, but you can add on. One to create board, create task, change task status.
# What it produced:
The project currently has React/Vite but no Express server. Plan for this step: add Express and a minimal API server, expose stubbed JSON routes GET /board (needed for the earlier spec), POST /board, POST /board/:boardId/tasks, PATCH /tasks/:taskId/status, and DELETE /tasks/:taskId (for task removal). Each stub will respond with HTTP 501 and a clear “not implemented yet” message—no SQL/database wiring, persistence, or UI integration. Add a Vite dev proxy and npm server script so the React app can call these paths locally. 
# Fixed or Rejected:
This seemed good. It added remove but it was minor.
# Verification:
Was able to run it and see the HTTP 501 and not implemented yet.


## Third Prompt
# What I asked for:
Do the board creatio API. It should call mysql and create it. Create a file that it ignored by git so i can add things like my username and password to get into the database which the api will use if needed.
# What it produced:
MySQL connection pool using mysql2 and load credentials from a project-root .env file; add .env to .gitignore and provide a blank .env.example template so passwords aren’t committed. Implement POST /board to validate a title and optional columns (defaulting to To-do, In progress, Done), then insert the board and ordered columns together in a transaction using the existing schema. Return the created board and columns on success, and explicit validation/database error responses without exposing credentials.
# Fixed or Rejected:
This seemed good. It's creating a connection pool while protecting credentials like I asked. I forgot to add that it should be connected to the creation button.
# Verification:
I created a board and use select in mysql to view it. I saw the created board and the columns with the right values.