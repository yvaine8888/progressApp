import { useEffect, useRef, useState } from 'react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom'
import './App.css'

const defaultColumns = ['To-do', 'In progress', 'Done']

function useBoards(refreshKey = 0) {
  const [boards, setBoards] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadBoards() {
      setIsLoading(true)
      setError('')

      try {
        const response = await fetch('/board', { signal: controller.signal })
        let result

        try {
          result = await response.json()
        } catch {
          throw new Error('The server returned an invalid response.')
        }

        if (!response.ok) {
          throw new Error(
            typeof result.message === 'string'
              ? result.message
              : 'Boards could not be loaded.',
          )
        }

        if (!Array.isArray(result.boards)) {
          throw new Error('The server returned an invalid board list.')
        }

        setBoards(result.boards)
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'Could not load boards.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadBoards()
    return () => controller.abort()
  }, [refreshKey])

  return { boards, isLoading, error }
}

function ConfirmDialog({
  title,
  message,
  error,
  isSubmitting,
  confirmLabel,
  onCancel,
  onConfirm,
}) {
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onCancel()
      }}
    >
      <section
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className="board-dialog confirm-dialog"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !isSubmitting) onCancel()
        }}
        role="dialog"
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">PLEASE CONFIRM</span>
            <h2 id="confirm-dialog-title">{title}</h2>
            <p>{message}</p>
          </div>
        </div>
        {error && <p className="form-message form-message--error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button
            className="secondary-button"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="danger-button"
            disabled={isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            {isSubmitting ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

function useBoardTasks(boardId, refreshKey) {
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadTasks() {
      setIsLoading(true)
      setError('')

      try {
        const response = await fetch(`/board/${boardId}/tasks`, {
          signal: controller.signal,
        })
        let result

        try {
          result = await response.json()
        } catch {
          throw new Error('The server returned an invalid response.')
        }

        if (!response.ok) {
          throw new Error(
            typeof result.message === 'string'
              ? result.message
              : 'Tasks could not be loaded.',
          )
        }

        if (!Array.isArray(result.tasks)) {
          throw new Error('The server returned an invalid task list.')
        }

        setTasks(result.tasks)
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'Could not load tasks.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadTasks()
    return () => controller.abort()
  }, [boardId, refreshKey])

  return { tasks, isLoading, error }
}

function getDueDateInfo(dueDate, columnName) {
  if (!dueDate) return null

  const [year, month, day] = dueDate.split('-').map(Number)
  const due = Date.UTC(year, month - 1, day)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const daysUntilDue = Math.round((due - today) / 86400000)
  const isCompletedColumn = ['done', 'completed', 'complete'].includes(
    columnName.trim().toLocaleLowerCase(),
  )

  if (daysUntilDue === 0) {
    return { label: 'Due today', className: 'task-due-date--near' }
  }

  const isOverdue = daysUntilDue < 0
  const days = Math.abs(daysUntilDue)
  let amount = days
  let unit = 'day'

  if (days >= 365) {
    amount = Math.round(days / 365)
    unit = 'year'
  } else if (days >= 30) {
    amount = Math.round(days / 30)
    unit = 'month'
  } else if (days >= 7) {
    amount = Math.round(days / 7)
    unit = 'week'
  }

  const duration = `${amount} ${unit}${amount === 1 ? '' : 's'}`
  if (isOverdue) {
    return {
      label: `Overdue by ${duration}`,
      className: isCompletedColumn ? '' : 'task-due-date--overdue',
      isOverdue: !isCompletedColumn,
    }
  }

  return {
    label: `Due in ${duration}`,
    className: daysUntilDue <= 3 ? 'task-due-date--near' : '',
  }
}

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Dayboard home">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>dayboard</span>
    </Link>
  )
}

function BoardNavigation({ boards, activeBoardId }) {
  if (boards.length === 0) return null

  return (
    <nav aria-label="Your boards" className="board-navigation">
      {boards.map((board) => (
        <NavLink
          aria-current={board.id === activeBoardId ? 'page' : undefined}
          className={({ isActive }) =>
            `board-nav-link${isActive ? ' board-nav-link--active' : ''}`
          }
          key={board.id}
          to={`/board/${board.id}`}
        >
          {board.title}
        </NavLink>
      ))}
    </nav>
  )
}

function HomePage() {
  const [boardsRefreshKey, setBoardsRefreshKey] = useState(0)
  const { boards, isLoading, error } = useBoards(boardsRefreshKey)
  const navigate = useNavigate()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [boardTitle, setBoardTitle] = useState('')
  const [columns, setColumns] = useState(defaultColumns)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [boardToDelete, setBoardToDelete] = useState(null)
  const [deleteBoardError, setDeleteBoardError] = useState('')
  const [isDeletingBoard, setIsDeletingBoard] = useState(false)
  const titleInputRef = useRef(null)

  useEffect(() => {
    if (isDialogOpen) {
      titleInputRef.current?.focus()
    }
  }, [isDialogOpen])

  function openDialog() {
    setBoardTitle('')
    setColumns(defaultColumns)
    setMessage('')
    setIsDialogOpen(true)
  }

  function closeDialog() {
    if (isSubmitting) return
    setIsDialogOpen(false)
    setMessage('')
  }

  function updateColumn(index, value) {
    setColumns((currentColumns) =>
      currentColumns.map((column, columnIndex) =>
        columnIndex === index ? value : column,
      ),
    )
  }

  function addColumn() {
    setColumns((currentColumns) => [...currentColumns, ''])
  }

  function removeColumn(index) {
    setColumns((currentColumns) =>
      currentColumns.filter((_, columnIndex) => columnIndex !== index),
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: boardTitle, columns }),
      })
      let result

      try {
        result = await response.json()
      } catch {
        setMessage('The server returned an invalid response. Please try again.')
        return
      }

      if (!response.ok) {
        setMessage(
          typeof result.message === 'string'
            ? result.message
            : 'The board could not be created.',
        )
        return
      }

      setIsDialogOpen(false)
      navigate(`/board/${result.id}`)
    } catch {
      setMessage('Could not reach the server. Check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleBoardDelete() {
    if (!boardToDelete) return

    setDeleteBoardError('')
    setIsDeletingBoard(true)

    try {
      const response = await fetch(`/board/${boardToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        let result
        try {
          result = await response.json()
        } catch {
          throw new Error('The server returned an invalid response.')
        }
        throw new Error(
          typeof result.message === 'string'
            ? result.message
            : 'The board could not be deleted.',
        )
      }

      setBoardToDelete(null)
      setBoardsRefreshKey((currentKey) => currentKey + 1)
    } catch (deleteError) {
      setDeleteBoardError(deleteError.message || 'The board could not be deleted.')
    } finally {
      setIsDeletingBoard(false)
    }
  }

  function handleDialogKeyDown(event) {
    if (event.key === 'Escape' && !isSubmitting) {
      closeDialog()
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <Brand />
        <span className="topbar-note">A little more focus, every day.</span>
      </header>

      <section className="home-content" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <span className="eyebrow">YOUR SPACE TO MAKE PROGRESS</span>
          <h1 id="welcome-title">Make room for what matters.</h1>
          <p>Bring your tasks, plans, and next steps together in one calm place.</p>
        </div>

        <section aria-label="Your boards" className="boards-section">
          {error && (
            <p className="boards-message boards-message--error" role="alert">
              {error}
            </p>
          )}
          {isLoading && (
            <p className="boards-message" role="status">Loading your boards…</p>
          )}
          {!isLoading && !error && boards.length === 0 && (
            <p className="boards-message">Your boards will appear here.</p>
          )}
          <div className="board-grid">
            {boards.map((board) => (
              <article className="board-card-wrapper" key={board.id}>
                <Link
                  className="board-card"
                  to={`/board/${board.id}`}
                >
                  <span className="board-card-icon" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <h2>{board.title}</h2>
                  <p>
                    {board.columns.length} {board.columns.length === 1 ? 'column' : 'columns'}
                  </p>
                </Link>
                <button
                  aria-label={`Delete board ${board.title}`}
                  className="delete-icon-button board-delete-button"
                  onClick={() => {
                    setDeleteBoardError('')
                    setBoardToDelete(board)
                  }}
                  type="button"
                >
                  ×
                </button>
              </article>
            ))}
            <button className="add-board-card" type="button" onClick={openDialog}>
              <span className="add-board-icon" aria-hidden="true">+</span>
              <span className="add-board-label">Add a board</span>
              <span className="add-board-hint">Start with a title and your columns</span>
            </button>
          </div>
        </section>

        <div className="home-decoration" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      {isDialogOpen && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) closeDialog()
          }}
        >
          <section
            aria-labelledby="dialog-title"
            aria-modal="true"
            className="board-dialog"
            onKeyDown={handleDialogKeyDown}
            role="dialog"
          >
            <div className="dialog-heading">
              <div>
                <span className="eyebrow">A FRESH START</span>
                <h2 id="dialog-title">Set up your board</h2>
                <p>Give your board a name and shape it around your workflow.</p>
              </div>
              <button
                aria-label="Close dialog"
                className="icon-button"
                disabled={isSubmitting}
                onClick={closeDialog}
                type="button"
              >
                ×
              </button>
            </div>

            <form aria-busy={isSubmitting} onSubmit={handleSubmit}>
              <label className="field-label" htmlFor="board-title">
                Board title
              </label>
              <input
                autoComplete="off"
                className="text-input"
                disabled={isSubmitting}
                id="board-title"
                maxLength={120}
                onChange={(event) => setBoardTitle(event.target.value)}
                placeholder="e.g. Home projects"
                ref={titleInputRef}
                required
                value={boardTitle}
              />

              <div className="columns-heading">
                <div>
                  <span className="field-label">Columns</span>
                  <p className="field-hint">Rename, remove, or add a step.</p>
                </div>
                <button
                  className="text-button"
                  disabled={isSubmitting}
                  onClick={addColumn}
                  type="button"
                >
                  <span aria-hidden="true">+</span> Add column
                </button>
              </div>

              <div className="column-list">
                {columns.map((column, index) => (
                  <div className="column-row" key={index}>
                    <span className="column-grip" aria-hidden="true">⠿</span>
                    <input
                      aria-label={`Column ${index + 1} name`}
                      className="text-input column-input"
                      disabled={isSubmitting}
                      maxLength={80}
                      onChange={(event) => updateColumn(index, event.target.value)}
                      placeholder="Column name"
                      required
                      value={column}
                    />
                    <button
                      aria-label={`Remove column ${column || index + 1}`}
                      className="remove-column-button"
                      disabled={columns.length <= 1 || isSubmitting}
                      onClick={() => removeColumn(index)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {message && (
                <p className="form-message form-message--error" role="alert">{message}</p>
              )}

              <div className="dialog-actions">
                <button
                  className="secondary-button"
                  disabled={isSubmitting}
                  onClick={closeDialog}
                  type="button"
                >
                  Cancel
                </button>
                <button className="primary-button" disabled={isSubmitting} type="submit">
                  {isSubmitting ? 'Creating…' : 'Create board'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {boardToDelete && (
        <ConfirmDialog
          confirmLabel="Delete board"
          error={deleteBoardError}
          isSubmitting={isDeletingBoard}
          message={`“${boardToDelete.title}” and all of its tasks will be permanently deleted.`}
          onCancel={() => {
            if (!isDeletingBoard) {
              setBoardToDelete(null)
              setDeleteBoardError('')
            }
          }}
          onConfirm={handleBoardDelete}
          title="Delete this board?"
        />
      )}
    </main>
  )
}

function BoardPage() {
  const { boardId } = useParams()
  const [boardsRefreshKey, setBoardsRefreshKey] = useState(0)
  const { boards, isLoading, error } = useBoards(boardsRefreshKey)
  const [tasksRefreshKey, setTasksRefreshKey] = useState(0)
  const {
    tasks,
    isLoading: isLoadingTasks,
    error: tasksError,
  } = useBoardTasks(boardId, tasksRefreshKey)
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState(null)
  const [taskName, setTaskName] = useState('')
  const [taskDetails, setTaskDetails] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskColumnId, setTaskColumnId] = useState('')
  const [taskMessage, setTaskMessage] = useState('')
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [isBoardEditDialogOpen, setIsBoardEditDialogOpen] = useState(false)
  const [boardEditTitle, setBoardEditTitle] = useState('')
  const [boardEditMessage, setBoardEditMessage] = useState('')
  const [isSavingBoard, setIsSavingBoard] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState(null)
  const [deleteTaskError, setDeleteTaskError] = useState('')
  const [isDeletingTask, setIsDeletingTask] = useState(false)
  const [draggingTaskId, setDraggingTaskId] = useState('')
  const [movingTaskId, setMovingTaskId] = useState('')
  const [flaggingTaskId, setFlaggingTaskId] = useState('')
  const [flagError, setFlagError] = useState('')
  const [dropTargetColumnId, setDropTargetColumnId] = useState('')
  const [dragError, setDragError] = useState('')
  const taskNameInputRef = useRef(null)
  const board = boards.find((item) => item.id === boardId)
  const tasksByColumn = new Map(
    (board?.columns ?? []).map((column) => [column.id, []]),
  )

  for (const task of tasks) {
    tasksByColumn.get(task.columnId)?.push(task)
  }

  function openTaskDialog() {
    setTaskToEdit(null)
    setTaskName('')
    setTaskDetails('')
    setTaskDueDate('')
    setTaskColumnId(board?.columns[0]?.id ?? '')
    setTaskMessage('')
    setIsTaskDialogOpen(true)
  }

  function openTaskEditDialog(task) {
    setTaskToEdit(task)
    setTaskName(task.name)
    setTaskDetails(task.details ?? '')
    setTaskDueDate(task.dueDate ?? '')
    setTaskColumnId(task.columnId)
    setTaskMessage('')
    setIsTaskDialogOpen(true)
  }

  function openBoardEditDialog() {
    setBoardEditTitle(board.title)
    setBoardEditMessage('')
    setIsBoardEditDialogOpen(true)
  }

  useEffect(() => {
    if (isTaskDialogOpen) {
      taskNameInputRef.current?.focus()
    }
  }, [isTaskDialogOpen])

  function closeTaskDialog() {
    if (isCreatingTask) return
    setIsTaskDialogOpen(false)
    setTaskToEdit(null)
    setTaskMessage('')
  }

  async function handleTaskSubmit(event) {
    event.preventDefault()
    setTaskMessage('')
    setIsCreatingTask(true)

    try {
      const response = await fetch(
        taskToEdit ? `/tasks/${taskToEdit.id}` : `/board/${boardId}/tasks`,
        {
        method: taskToEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: taskName,
          details: taskDetails,
          dueDate: taskDueDate || null,
          columnId: taskColumnId,
        }),
        },
      )
      let result

      try {
        result = await response.json()
      } catch {
        setTaskMessage('The server returned an invalid response. Please try again.')
        return
      }

      if (!response.ok) {
        setTaskMessage(
          typeof result.message === 'string'
            ? result.message
            : `The task could not be ${taskToEdit ? 'updated' : 'created'}.`,
        )
        return
      }

      setIsTaskDialogOpen(false)
      setTaskName('')
      setTaskDetails('')
      setTaskDueDate('')
      setTaskColumnId(board?.columns[0]?.id ?? '')
      setTaskToEdit(null)
      setTasksRefreshKey((currentKey) => currentKey + 1)
    } catch {
      setTaskMessage('Could not reach the server. Check your connection and try again.')
    } finally {
      setIsCreatingTask(false)
    }
  }

  async function handleBoardEditSubmit(event) {
    event.preventDefault()
    setBoardEditMessage('')
    setIsSavingBoard(true)

    try {
      const response = await fetch(`/board/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: boardEditTitle }),
      })
      let result

      try {
        result = await response.json()
      } catch {
        setBoardEditMessage('The server returned an invalid response. Please try again.')
        return
      }

      if (!response.ok) {
        setBoardEditMessage(
          typeof result.message === 'string'
            ? result.message
            : 'The board title could not be updated.',
        )
        return
      }

      setIsBoardEditDialogOpen(false)
      setBoardsRefreshKey((currentKey) => currentKey + 1)
    } catch {
      setBoardEditMessage('Could not reach the server. Check your connection and try again.')
    } finally {
      setIsSavingBoard(false)
    }
  }

  function handleTaskDragStart(event, task) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', task.id)
    setDraggingTaskId(task.id)
    setDragError('')
  }

  function handleTaskDragEnd() {
    setDraggingTaskId('')
    setDropTargetColumnId('')
  }

  async function handleColumnDrop(event, columnId) {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('text/plain') || draggingTaskId
    const task = tasks.find((item) => item.id === taskId)

    setDropTargetColumnId('')
    setDraggingTaskId('')

    if (!task || task.columnId === columnId || movingTaskId) return

    setDragError('')
    setMovingTaskId(taskId)

    try {
      const response = await fetch(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId }),
      })
      let result

      try {
        result = await response.json()
      } catch {
        throw new Error('The server returned an invalid response.')
      }

      if (!response.ok) {
        throw new Error(
          typeof result.message === 'string'
            ? result.message
            : 'The task could not be moved.',
        )
      }

      setTasksRefreshKey((currentKey) => currentKey + 1)
    } catch (moveError) {
      setDragError(moveError.message || 'The task could not be moved.')
    } finally {
      setMovingTaskId('')
    }
  }

  async function handleTaskDelete() {
    if (!taskToDelete) return

    setDeleteTaskError('')
    setIsDeletingTask(true)

    try {
      const response = await fetch(`/tasks/${taskToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        let result
        try {
          result = await response.json()
        } catch {
          throw new Error('The server returned an invalid response.')
        }
        throw new Error(
          typeof result.message === 'string'
            ? result.message
            : 'The task could not be deleted.',
        )
      }

      setTaskToDelete(null)
      setTasksRefreshKey((currentKey) => currentKey + 1)
    } catch (deleteError) {
      setDeleteTaskError(deleteError.message || 'The task could not be deleted.')
    } finally {
      setIsDeletingTask(false)
    }
  }

  async function handleTaskFlag(task) {
    setFlagError('')
    setFlaggingTaskId(task.id)

    try {
      const response = await fetch(`/tasks/${task.id}/blocked`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: !task.isBlocked }),
      })
      let result

      try {
        result = await response.json()
      } catch {
        throw new Error('The server returned an invalid response.')
      }

      if (!response.ok) {
        throw new Error(
          typeof result.message === 'string'
            ? result.message
            : 'The task flag could not be updated.',
        )
      }

      setTasksRefreshKey((currentKey) => currentKey + 1)
    } catch (error) {
      setFlagError(error.message || 'The task flag could not be updated.')
    } finally {
      setFlaggingTaskId('')
    }
  }

  return (
    <main className="board-page">
      <header className="topbar board-topbar">
        <Brand />
        <span className="topbar-note">A little more focus, every day.</span>
      </header>
      <BoardNavigation activeBoardId={boardId} boards={boards} />

      {isLoading && (
        <p className="board-page-message" role="status">Loading your board…</p>
      )}
      {!isLoading && error && (
        <p className="board-page-message board-page-message--error" role="alert">
          {error}
        </p>
      )}
      {!isLoading && !error && !board && (
        <section className="board-page-message board-not-found">
          <h1>Board not found</h1>
          <p>This board may have been removed or the link may be incorrect.</p>
          <Link className="back-home-link" to="/">Back to all boards</Link>
        </section>
      )}
      {!isLoading && !error && board && (
        <section aria-labelledby="board-title-heading" className="board-workspace">
          <div className="board-heading">
            <div>
              <div className="board-title-row">
                <h1 id="board-title-heading">{board.title}</h1>
                <button
                  aria-label={`Edit board title ${board.title}`}
                  className="edit-icon-button"
                  onClick={openBoardEditDialog}
                  type="button"
                >
                  <span aria-hidden="true">✎</span>
                </button>
              </div>
            </div>
            <button
              className="primary-button add-task-button"
              onClick={openTaskDialog}
              type="button"
            >
              <span aria-hidden="true">+</span> Add task
            </button>
          </div>
          {tasksError && (
            <p className="board-page-message board-page-message--error" role="alert">
              {tasksError}
            </p>
          )}
          {isLoadingTasks && (
            <p className="board-page-message" role="status">Loading tasks…</p>
          )}
          {dragError && (
            <p className="board-page-message board-page-message--error" role="alert">
              {dragError}
            </p>
          )}
          {flagError && (
            <p className="board-page-message board-page-message--error" role="alert">
              {flagError}
            </p>
          )}
          {movingTaskId && (
            <p className="board-page-message" role="status">Moving task…</p>
          )}
          <div aria-label={`${board.title} columns`} className="kanban-columns">
            {board.columns.map((column) => (
              <section
                className={`kanban-column${dropTargetColumnId === column.id ? ' kanban-column--drop-target' : ''}`}
                key={column.id}
                onDragEnter={() => {
                  if (draggingTaskId) setDropTargetColumnId(column.id)
                }}
                onDragLeave={(event) => {
                  if (
                    !event.currentTarget.contains(event.relatedTarget) &&
                    dropTargetColumnId === column.id
                  ) {
                    setDropTargetColumnId('')
                  }
                }}
                onDragOver={(event) => {
                  if (draggingTaskId) {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    setDropTargetColumnId(column.id)
                  }
                }}
                onDrop={(event) => handleColumnDrop(event, column.id)}
              >
                <header className="kanban-column-heading">
                  <h2>{column.name}</h2>
                  <span className="task-count">
                    {(tasksByColumn.get(column.id) ?? []).length}
                  </span>
                </header>
                <div className="kanban-task-list">
                  {(tasksByColumn.get(column.id) ?? []).map((task) => {
                    const dueDateInfo = getDueDateInfo(task.dueDate, column.name)
                    const isOverdue = Boolean(dueDateInfo?.isOverdue)

                    return (
                    <article
                      className={[
                        'task-card',
                        task.isBlocked || isOverdue ? 'task-card--flagged' : '',
                        movingTaskId === task.id ? 'task-card--moving' : '',
                      ].filter(Boolean).join(' ')}
                      draggable={!movingTaskId}
                      key={task.id}
                      onDragEnd={handleTaskDragEnd}
                      onDragStart={(event) => handleTaskDragStart(event, task)}
                    >
                      <button
                        aria-label={task.isBlocked
                          ? `Unflag task ${task.name} as blocked`
                          : `Flag task ${task.name} as blocked`}
                        aria-pressed={task.isBlocked}
                        className={`flag-icon-button task-flag-button${task.isBlocked ? ' flag-icon-button--active' : ''}`}
                        disabled={flaggingTaskId === task.id || movingTaskId === task.id}
                        draggable="false"
                        onClick={() => handleTaskFlag(task)}
                        onDragStart={(event) => event.preventDefault()}
                        type="button"
                      >
                        <svg aria-hidden="true" viewBox="0 0 20 20">
                          <path className="flag-pole" d="M5 18V3.5" />
                          <path className="flag-shape" d="M5.5 4h9l-1.6 3.1L14.5 10h-9z" />
                        </svg>
                      </button>
                      <button
                        aria-label={`Edit task ${task.name}`}
                        className="edit-icon-button task-edit-button"
                        disabled={movingTaskId === task.id}
                        draggable="false"
                        onClick={() => openTaskEditDialog(task)}
                        onDragStart={(event) => event.preventDefault()}
                        type="button"
                      >
                        <span aria-hidden="true">✎</span>
                      </button>
                      <button
                        aria-label={`Delete task ${task.name}`}
                        className="delete-icon-button task-delete-button"
                        disabled={movingTaskId === task.id}
                        draggable="false"
                        onClick={() => {
                          setDeleteTaskError('')
                          setTaskToDelete(task)
                        }}
                        onDragStart={(event) => event.preventDefault()}
                        type="button"
                      >
                        ×
                      </button>
                      <h3>{task.name}</h3>
                      {task.details && <p>{task.details}</p>}
                      {dueDateInfo && (
                        <time
                          className={`task-due-date ${dueDateInfo.className}`}
                          dateTime={task.dueDate}
                        >
                          {dueDateInfo.label}
                        </time>
                      )}
                    </article>
                    )
                  })}
                  {!isLoadingTasks && (tasksByColumn.get(column.id) ?? []).length === 0 && (
                    <p className="empty-column">No tasks yet</p>
                  )}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}

      {isTaskDialogOpen && board && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isCreatingTask) closeTaskDialog()
          }}
        >
          <section
            aria-labelledby="task-dialog-title"
            aria-modal="true"
            className="board-dialog"
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !isCreatingTask) closeTaskDialog()
            }}
            role="dialog"
          >
            <div className="dialog-heading">
              <div>
                <span className="eyebrow">{board.title}</span>
                <h2 id="task-dialog-title">{taskToEdit ? 'Edit task' : 'Add a task'}</h2>
                <p>Capture the details so you can keep moving forward.</p>
              </div>
              <button
                aria-label="Close dialog"
                className="icon-button"
                disabled={isCreatingTask}
                onClick={closeTaskDialog}
                type="button"
              >
                ×
              </button>
            </div>

            <form aria-busy={isCreatingTask} onSubmit={handleTaskSubmit}>
              <label className="field-label" htmlFor="task-title">Task name</label>
              <input
                autoComplete="off"
                className="text-input"
                disabled={isCreatingTask}
                id="task-title"
                maxLength={180}
                onChange={(event) => setTaskName(event.target.value)}
                placeholder="e.g. Plan the week"
                ref={taskNameInputRef}
                required
                value={taskName}
              />

              <label className="field-label task-field-label" htmlFor="task-details">
                Details <span className="optional-label">Optional</span>
              </label>
              <textarea
                className="text-input task-details-input"
                disabled={isCreatingTask}
                id="task-details"
                maxLength={10000}
                onChange={(event) => setTaskDetails(event.target.value)}
                placeholder="Add any useful notes"
                rows={4}
                value={taskDetails}
              />

              <label className="field-label task-field-label" htmlFor="task-column">
                Column
              </label>
              <select
                className="text-input"
                disabled={isCreatingTask}
                id="task-column"
                onChange={(event) => setTaskColumnId(event.target.value)}
                required
                value={taskColumnId}
              >
                {board.columns.map((column) => (
                  <option key={column.id} value={column.id}>{column.name}</option>
                ))}
              </select>

              <label className="field-label task-field-label" htmlFor="task-due-date">
                Due date <span className="optional-label">Optional</span>
              </label>
              <input
                className="text-input"
                disabled={isCreatingTask}
                id="task-due-date"
                onChange={(event) => setTaskDueDate(event.target.value)}
                type="date"
                value={taskDueDate}
              />

              {taskMessage && (
                <p className="form-message form-message--error" role="alert">
                  {taskMessage}
                </p>
              )}

              <div className="dialog-actions">
                <button
                  className="secondary-button"
                  disabled={isCreatingTask}
                  onClick={closeTaskDialog}
                  type="button"
                >
                  Cancel
                </button>
                <button className="primary-button" disabled={isCreatingTask} type="submit">
                  {isCreatingTask
                    ? (taskToEdit ? 'Saving…' : 'Creating…')
                    : (taskToEdit ? 'Save changes' : 'Create task')}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {isBoardEditDialogOpen && board && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSavingBoard) {
              setIsBoardEditDialogOpen(false)
            }
          }}
        >
          <section
            aria-labelledby="edit-board-dialog-title"
            aria-modal="true"
            className="board-dialog"
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !isSavingBoard) {
                setIsBoardEditDialogOpen(false)
              }
            }}
            role="dialog"
          >
            <div className="dialog-heading">
              <div>
                <span className="eyebrow">BOARD DETAILS</span>
                <h2 id="edit-board-dialog-title">Edit board title</h2>
                <p>Update the name shown across your board.</p>
              </div>
              <button
                aria-label="Close dialog"
                className="icon-button"
                disabled={isSavingBoard}
                onClick={() => setIsBoardEditDialogOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <form aria-busy={isSavingBoard} onSubmit={handleBoardEditSubmit}>
              <label className="field-label" htmlFor="edit-board-title">Board title</label>
              <input
                autoComplete="off"
                className="text-input"
                disabled={isSavingBoard}
                id="edit-board-title"
                maxLength={120}
                onChange={(event) => setBoardEditTitle(event.target.value)}
                required
                value={boardEditTitle}
              />
              {boardEditMessage && (
                <p className="form-message form-message--error" role="alert">
                  {boardEditMessage}
                </p>
              )}
              <div className="dialog-actions">
                <button
                  className="secondary-button"
                  disabled={isSavingBoard}
                  onClick={() => setIsBoardEditDialogOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button className="primary-button" disabled={isSavingBoard} type="submit">
                  {isSavingBoard ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {taskToDelete && (
        <ConfirmDialog
          confirmLabel="Delete task"
          error={deleteTaskError}
          isSubmitting={isDeletingTask}
          message={`“${taskToDelete.name}” will be permanently deleted.`}
          onCancel={() => {
            if (!isDeletingTask) {
              setTaskToDelete(null)
              setDeleteTaskError('')
            }
          }}
          onConfirm={handleTaskDelete}
          title="Delete this task?"
        />
      )}
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<HomePage />} path="/" />
        <Route element={<BoardPage />} path="/board/:boardId" />
        <Route element={<HomePage />} path="*" />
      </Routes>
    </BrowserRouter>
  )
}

export default App
