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


## Fourth Prompt
# What I asked for:
One the home page, there should be a get api endpoint that gets all board information from my sql to render it on the home page with the title as a card.
# What it produced:
Implemented GET /board to return all boards with their ordered columns and tasks from MySQL. The home page fetches the endpoint on load and renders board-title cards with loading, empty, and error states. After successful board creation, it reloads the board list.
# Fixed or Rejected:
Approved.
# Verification:
I saw the cards of the boards. I created a new one and a new card showed up.


## Fifth Prompt
# What I asked for:
Create a ui for the actual board. If there is too many columns more than the actual length of page, allow them to move to the right. Board title should be there with rendered columns. Add a nav to that page. There should be links or tabs to each board. The day board or title at top shoudl be linked to home page. The cards to should linked to the corresponding board, and after someone creates a board, it shoud take them to the baord created.
# What it produced:
Plan for this step: use the existing GET /board response (boards already include their ordered columns/tasks) to render a board page at /board/:id. Add horizontal scrolling to the board’s columns so extra columns can be reached by scrolling right. Make the Dayboard brand link home, make home board cards links, and show board tabs/links in the board-page navigation. After creating a board, navigate directly to its page. Include loading and not-found/error handling.
# Fixed or Rejected:
It seemed good but I remember one of the requirements was to use React router. I told it too change its plan to use that instead. I want navigation to be handled by react router and the actual logic to be handled by apis.
# Verification:
I was able to click on a card to go the the board. The columns were rendered and there was anav bar with links to each board.



## Sixth Prompt
# What I asked for:
In the actual board page, get rid of all boards button and replace with an add button to create tasks. When the user clicks on it, it should show a pop up asking for the tasks details. Actual task creation should be done later. 
# What it produced:
Plan for this change: replace the board page’s “All boards” button with an “Add task” button. Clicking it will open a dialog for task title, details, due date, and blocked status, with Cancel and a disabled/not-yet-implemented submit action so it does not call any API or create a task.
# Fixed or Rejected:
No need for blocked status.
# Verification:
I was able to click on add task which popped up with it asking for title, details, and due date. Cancel worked and add was not implemented yet.

## Seventh Prompt
# What I asked for:
Now its time for task creation and task render. There should be a post api that creates a task after the create button is clicked. It adds to the database. Then there should be a get api for the tasks. It renders the task itself onto the board by getting the information from mysql. It renders the task title, details below, and due date as in due in one day or due in one year
# What it produced:
implement GET /board/:boardId/tasks and make the board page load those tasks from MySQL, plus implement POST /board/:boardId/tasks to validate and insert task name, optional details, optional due date, and chosen column. Add a column selector to the existing task dialog (defaulting to the first column), and after creation reload the board’s tasks. Render title, details, and a relative due label such as “Due in 1 day” or “Due in 1 year” (with sensible labels for today/overdue)
# Fixed or Rejected:
It seemed good. Approved.
# Verification:
I was able to click on add task which popped up with it asking for title, details, and due date. Cancel worked and add was not implemented yet.



## Eighth Prompt
# What I asked for:
Now it is time to allow the user to change the task status. Allow the user to be abel to drag the cards across the screen. When they let go, the column it is in is the new status. Create a patch api that changes the status.
# What it produced:
Plan for this step: implement PATCH /tasks/:taskId/status to validate the task and destination columnId and update tasks.column_id in MySQL; make task cards draggable and columns valid drop targets; on drop, call the PATCH endpoint, reload the board’s tasks after success, and show a clear error if the save fails. I’ll use native browser drag-and-drop (no new package)
# Fixed or Rejected:
It seemed good. Approved.
# Verification:
Was able to click and drag cards to different columns. Verified that mysql changed in reponse too.

## Ninth Prompt
# What I asked for:
Time to implement delete apis. For both the board and tasks add a button that deletes it. For the board, there should be an x button on the board card in the home page. The api should delete the board from the board table and the corresponding tasks from the database. Then for the task delete button, add an x button to the card. Again it should delete from database. When any delete button is clicked, a pop up should appear to make sure the suer wants to do this,
# What it produced:
add DELETE /board/:boardId and implement the existing DELETE /tasks/:taskId route. Board deletion will use a MySQL transaction to delete tasks in its columns first, then delete the board; this is needed because the current task-to-column foreign key uses ON DELETE RESTRICT. Add an X control to each home-page board card and each task card, with an in-app confirmation dialog before sending either DELETE request. On success, refresh the home list or board tasks; report API errors without pretending deletion succeeded. 
# Fixed or Rejected:
It seemed good. Approved.
# Verification:
Was able to deelete both boards and takss. Had a pop up asking for verificcation and was able to verify in mysql.

## Tenth Prompt
# What I asked for:
I want to add a modify button for both tasks and boards. For the board, add an edit button next to the title in the actual board page. Or if its easier, add it to the baord card, next to the delete button. For the tasks, add it to the card, next to the detele button. For both of them, when the button is clcicked, it should show up with its corresponding pop up with inputs already filled with its info. When the create button is clicked, it should go to a patch api that changes the database.
# What it produced:
add a board edit button beside the title on its board page, opening a prefilled title dialog and saving via PATCH /board/:boardId. Add an edit button beside each task’s delete button; its prefilled dialog edits task name, details, due date, and column, saving via PATCH /tasks/:taskId. Validate inputs in the API, refresh board/task data after success, and show errors in the dialogs.
# Fixed or Rejected:
It seemed good. Approved.
# Verification:
Was able to modify board title. Was able to modify taks title, add details, and change due date with card changing in response. Verified change in mysql.


## Eleventh Prompt
# What I asked for:
Time to add more to tasks. Add a flag button next to the edit button in tht task card. When clicked on, it should fill in the flag and change the card to a pastel red. When the flag is clicked on again, it shoudl change back to normal. Lets add this to the due date too. When the date is nearing it should change colors to a deeper purple. When overdue, it should also be a pastel red like when it is flagged. However, when it is put into a column like done or similar columns like that, it should be normal.
# What it produced:
 add a flag button next to task edit, persist toggles through PATCH /tasks/:taskId/blocked into the existing is_blocked column, and render flagged cards with a filled flag plus pastel-red background. Style due dates within 3 days (including today) in deeper purple; style overdue dates pastel red unless the task is in a column named done, completed, or complete (case-insensitive, trimmed). Flagged cards stay red regardless of column.
# Fixed or Rejected:
It seemed good. Approved.
# Verification:
Was able to unflag and flag tasks with a new red card. Naring due dates turned a darker purple and overdue was red unless in done column.