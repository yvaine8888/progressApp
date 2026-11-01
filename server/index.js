import express from 'express'
import pool from './db.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const defaultColumns = ['To-do', 'In progress', 'Done']

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid port number between 1 and 65535.')
}

app.use(express.json({ limit: '100kb' }))

app.get('/board', async (_req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        b.id AS board_id,
        b.title AS board_title,
        c.id AS column_id,
        c.name AS column_name,
        c.sort_order,
        t.id AS task_id,
        t.name AS task_name,
        t.details AS task_details,
        t.due_date AS task_due_date,
        t.is_blocked AS task_is_blocked
      FROM boards b
      LEFT JOIN board_columns c ON c.board_id = b.id
      LEFT JOIN tasks t ON t.column_id = c.id
      ORDER BY b.id, c.sort_order, t.id
    `)

    const boardsById = new Map()

    for (const row of rows) {
      const boardId = String(row.board_id)
      let board = boardsById.get(boardId)

      if (!board) {
        board = {
          id: boardId,
          title: row.board_title,
          columns: [],
        }
        boardsById.set(boardId, board)
      }

      if (row.column_id === null) continue

      const columnId = String(row.column_id)
      let column = board.columns.find((item) => item.id === columnId)

      if (!column) {
        column = {
          id: columnId,
          name: row.column_name,
          sortOrder: row.sort_order,
          tasks: [],
        }
        board.columns.push(column)
      }

      if (row.task_id !== null) {
        column.tasks.push({
          id: String(row.task_id),
          name: row.task_name,
          details: row.task_details,
          dueDate: row.task_due_date,
          isBlocked: Boolean(row.task_is_blocked),
        })
      }
    }

    return res.json({ boards: [...boardsById.values()] })
  } catch (error) {
    console.error('Failed to get boards:', error.message)
    return res.status(500).json({
      error: 'Board retrieval failed',
      message: 'Boards could not be loaded from the database.',
    })
  }
})

app.post('/board', async (req, res) => {
  const { title } = req.body ?? {}
  const columns = req.body?.columns ?? defaultColumns

  if (typeof title !== 'string' || title.trim().length === 0 || title.trim().length > 120) {
    return res.status(400).json({
      error: 'Invalid board title',
      message: 'Title must contain between 1 and 120 characters.',
    })
  }

  if (
    !Array.isArray(columns) ||
    columns.length === 0 ||
    columns.some(
      (column) =>
        typeof column !== 'string' ||
        column.trim().length === 0 ||
        column.trim().length > 80,
    )
  ) {
    return res.status(400).json({
      error: 'Invalid board columns',
      message: 'Columns must be a non-empty array of names up to 80 characters each.',
    })
  }

  let connection

  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()

    const [boardResult] = await connection.execute(
      'INSERT INTO boards (title) VALUES (?)',
      [title.trim()],
    )

    const createdColumns = []
    for (const [sortOrder, name] of columns.entries()) {
      const [columnResult] = await connection.execute(
        'INSERT INTO board_columns (board_id, name, sort_order) VALUES (?, ?, ?)',
        [boardResult.insertId, name.trim(), sortOrder],
      )
      createdColumns.push({
        id: String(columnResult.insertId),
        name: name.trim(),
        sortOrder,
      })
    }

    await connection.commit()

    return res.status(201).json({
      id: String(boardResult.insertId),
      title: title.trim(),
      columns: createdColumns,
    })
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback()
      } catch (rollbackError) {
        console.error('Failed to roll back board creation:', rollbackError.message)
      }
    }

    console.error('Failed to create board:', error.message)
    return res.status(500).json({
      error: 'Board creation failed',
      message: 'The board could not be saved to the database.',
    })
  } finally {
    connection?.release()
  }
})

app.patch('/board/:boardId', async (req, res) => {
  const { boardId } = req.params
  const { title } = req.body ?? {}

  if (!isValidId(boardId)) {
    return res.status(400).json({
      error: 'Invalid board ID',
      message: 'Board ID must be a positive integer.',
    })
  }

  if (typeof title !== 'string' || title.trim().length === 0 || title.trim().length > 120) {
    return res.status(400).json({
      error: 'Invalid board title',
      message: 'Title must contain between 1 and 120 characters.',
    })
  }

  try {
    const [result] = await pool.execute(
      'UPDATE boards SET title = ? WHERE id = ?',
      [title.trim(), boardId],
    )

    if (result.affectedRows === 0) {
      const [boards] = await pool.execute(
        'SELECT id FROM boards WHERE id = ?',
        [boardId],
      )

      if (boards.length === 0) {
        return res.status(404).json({
          error: 'Board not found',
          message: 'The board could not be found.',
        })
      }
    }

    return res.json({ id: String(boardId), title: title.trim() })
  } catch (error) {
    console.error('Failed to update board:', error.message)
    return res.status(500).json({
      error: 'Board update failed',
      message: 'The board title could not be saved to the database.',
    })
  }
})

app.delete('/board/:boardId', async (req, res) => {
  const { boardId } = req.params

  if (!isValidId(boardId)) {
    return res.status(400).json({
      error: 'Invalid board ID',
      message: 'Board ID must be a positive integer.',
    })
  }

  let connection

  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()

    const [boards] = await connection.execute(
      'SELECT id FROM boards WHERE id = ? FOR UPDATE',
      [boardId],
    )

    if (boards.length === 0) {
      await connection.rollback()
      return res.status(404).json({
        error: 'Board not found',
        message: 'The board could not be found.',
      })
    }

    await connection.execute(
      `DELETE t FROM tasks t
       INNER JOIN board_columns c ON c.id = t.column_id
       WHERE c.board_id = ?`,
      [boardId],
    )
    await connection.execute('DELETE FROM boards WHERE id = ?', [boardId])
    await connection.commit()

    return res.status(204).end()
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback()
      } catch (rollbackError) {
        console.error('Failed to roll back board deletion:', rollbackError.message)
      }
    }

    console.error('Failed to delete board:', error.message)
    return res.status(500).json({
      error: 'Board deletion failed',
      message: 'The board could not be deleted from the database.',
    })
  } finally {
    connection?.release()
  }
})

function isValidId(id) {
  return /^[1-9]\d*$/.test(id)
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

app.get('/board/:boardId/tasks', async (req, res) => {
  const { boardId } = req.params

  if (!isValidId(boardId)) {
    return res.status(400).json({
      error: 'Invalid board ID',
      message: 'Board ID must be a positive integer.',
    })
  }

  try {
    const [rows] = await pool.execute(
      `SELECT
        t.id,
        c.id AS column_id,
        t.name,
        t.details,
        DATE_FORMAT(t.due_date, '%Y-%m-%d') AS due_date,
        t.is_blocked
      FROM tasks t
      INNER JOIN board_columns c ON c.id = t.column_id
      WHERE c.board_id = ?
      ORDER BY c.sort_order, t.id`,
      [boardId],
    )

    return res.json({
      tasks: rows.map((row) => ({
        id: String(row.id),
        columnId: String(row.column_id),
        name: row.name,
        details: row.details,
        dueDate: row.due_date,
        isBlocked: Boolean(row.is_blocked),
      })),
    })
  } catch (error) {
    console.error('Failed to get board tasks:', error.message)
    return res.status(500).json({
      error: 'Task retrieval failed',
      message: 'Tasks could not be loaded from the database.',
    })
  }
})

app.post('/board/:boardId/tasks', async (req, res) => {
  const { boardId } = req.params
  const { name, details = '', dueDate = null, columnId } = req.body ?? {}

  if (!isValidId(boardId)) {
    return res.status(400).json({
      error: 'Invalid board ID',
      message: 'Board ID must be a positive integer.',
    })
  }

  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 180) {
    return res.status(400).json({
      error: 'Invalid task name',
      message: 'Task name must contain between 1 and 180 characters.',
    })
  }

  if (typeof details !== 'string' || details.length > 10000) {
    return res.status(400).json({
      error: 'Invalid task details',
      message: 'Task details must be text no longer than 10,000 characters.',
    })
  }

  if (dueDate !== null && dueDate !== '' && !isValidDate(dueDate)) {
    return res.status(400).json({
      error: 'Invalid due date',
      message: 'Due date must be a valid date in YYYY-MM-DD format.',
    })
  }

  if (typeof columnId !== 'string' && typeof columnId !== 'number') {
    return res.status(400).json({
      error: 'Invalid column',
      message: 'Choose a column for this task.',
    })
  }

  const normalizedColumnId = String(columnId)
  if (!isValidId(normalizedColumnId)) {
    return res.status(400).json({
      error: 'Invalid column',
      message: 'Choose a valid column for this task.',
    })
  }

  try {
    const [columns] = await pool.execute(
      'SELECT id FROM board_columns WHERE id = ? AND board_id = ?',
      [normalizedColumnId, boardId],
    )

    if (columns.length === 0) {
      return res.status(404).json({
        error: 'Board or column not found',
        message: 'The selected column does not belong to this board.',
      })
    }

    const [result] = await pool.execute(
      'INSERT INTO tasks (column_id, name, details, due_date) VALUES (?, ?, ?, ?)',
      [
        normalizedColumnId,
        name.trim(),
        details.trim() || null,
        dueDate || null,
      ],
    )

    return res.status(201).json({
      id: String(result.insertId),
      columnId: normalizedColumnId,
      name: name.trim(),
      details: details.trim() || null,
      dueDate: dueDate || null,
      isBlocked: false,
    })
  } catch (error) {
    console.error('Failed to create task:', error.message)
    return res.status(500).json({
      error: 'Task creation failed',
      message: 'The task could not be saved to the database.',
    })
  }
})

app.patch('/tasks/:taskId', async (req, res) => {
  const { taskId } = req.params
  const { name, details = '', dueDate = null, columnId } = req.body ?? {}

  if (!isValidId(taskId)) {
    return res.status(400).json({
      error: 'Invalid task ID',
      message: 'Task ID must be a positive integer.',
    })
  }

  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 180) {
    return res.status(400).json({
      error: 'Invalid task name',
      message: 'Task name must contain between 1 and 180 characters.',
    })
  }

  if (typeof details !== 'string' || details.length > 10000) {
    return res.status(400).json({
      error: 'Invalid task details',
      message: 'Task details must be text no longer than 10,000 characters.',
    })
  }

  if (dueDate !== null && dueDate !== '' && !isValidDate(dueDate)) {
    return res.status(400).json({
      error: 'Invalid due date',
      message: 'Due date must be a valid date in YYYY-MM-DD format.',
    })
  }

  if (
    (typeof columnId !== 'string' && typeof columnId !== 'number') ||
    !isValidId(String(columnId))
  ) {
    return res.status(400).json({
      error: 'Invalid column',
      message: 'Choose a valid column for this task.',
    })
  }

  const normalizedColumnId = String(columnId)

  try {
    const [taskRows] = await pool.execute(
      `SELECT c.board_id
       FROM tasks t
       INNER JOIN board_columns c ON c.id = t.column_id
       WHERE t.id = ?`,
      [taskId],
    )

    if (taskRows.length === 0) {
      return res.status(404).json({
        error: 'Task not found',
        message: 'The task could not be found.',
      })
    }

    const [columnRows] = await pool.execute(
      'SELECT id FROM board_columns WHERE id = ? AND board_id = ?',
      [normalizedColumnId, taskRows[0].board_id],
    )

    if (columnRows.length === 0) {
      return res.status(400).json({
        error: 'Invalid task column',
        message: 'Choose a column from the task’s board.',
      })
    }

    await pool.execute(
      `UPDATE tasks
       SET column_id = ?, name = ?, details = ?, due_date = ?
       WHERE id = ?`,
      [
        normalizedColumnId,
        name.trim(),
        details.trim() || null,
        dueDate || null,
        taskId,
      ],
    )

    return res.json({
      id: String(taskId),
      columnId: normalizedColumnId,
      name: name.trim(),
      details: details.trim() || null,
      dueDate: dueDate || null,
    })
  } catch (error) {
    console.error('Failed to update task:', error.message)
    return res.status(500).json({
      error: 'Task update failed',
      message: 'The task could not be saved to the database.',
    })
  }
})

app.patch('/tasks/:taskId/status', async (req, res) => {
  const { taskId } = req.params
  const { columnId } = req.body ?? {}

  if (!isValidId(taskId)) {
    return res.status(400).json({
      error: 'Invalid task ID',
      message: 'Task ID must be a positive integer.',
    })
  }

  if (
    (typeof columnId !== 'string' && typeof columnId !== 'number') ||
    !isValidId(String(columnId))
  ) {
    return res.status(400).json({
      error: 'Invalid column',
      message: 'Choose a valid column for this task.',
    })
  }

  const normalizedColumnId = String(columnId)

  try {
    const [columns] = await pool.execute(
      'SELECT id FROM board_columns WHERE id = ?',
      [normalizedColumnId],
    )

    if (columns.length === 0) {
      return res.status(404).json({
        error: 'Column not found',
        message: 'The selected column does not exist.',
      })
    }

    const [tasks] = await pool.execute(
      'SELECT id FROM tasks WHERE id = ?',
      [taskId],
    )

    if (tasks.length === 0) {
      return res.status(404).json({
        error: 'Task not found',
        message: 'The task could not be found.',
      })
    }

    await pool.execute(
      'UPDATE tasks SET column_id = ? WHERE id = ?',
      [normalizedColumnId, taskId],
    )

    return res.json({
      id: String(taskId),
      columnId: normalizedColumnId,
    })
  } catch (error) {
    console.error('Failed to change task status:', error.message)
    return res.status(500).json({
      error: 'Task status update failed',
      message: 'The task status could not be saved to the database.',
    })
  }
})

app.patch('/tasks/:taskId/blocked', async (req, res) => {
  const { taskId } = req.params
  const { isBlocked } = req.body ?? {}

  if (!isValidId(taskId)) {
    return res.status(400).json({
      error: 'Invalid task ID',
      message: 'Task ID must be a positive integer.',
    })
  }

  if (typeof isBlocked !== 'boolean') {
    return res.status(400).json({
      error: 'Invalid blocked status',
      message: 'isBlocked must be true or false.',
    })
  }

  try {
    const [result] = await pool.execute(
      'UPDATE tasks SET is_blocked = ? WHERE id = ?',
      [isBlocked, taskId],
    )

    if (result.affectedRows === 0) {
      const [tasks] = await pool.execute(
        'SELECT id FROM tasks WHERE id = ?',
        [taskId],
      )

      if (tasks.length === 0) {
        return res.status(404).json({
          error: 'Task not found',
          message: 'The task could not be found.',
        })
      }
    }

    return res.json({ id: String(taskId), isBlocked })
  } catch (error) {
    console.error('Failed to update task blocked status:', error.message)
    return res.status(500).json({
      error: 'Task flag update failed',
      message: 'The task flag could not be saved to the database.',
    })
  }
})

app.delete('/tasks/:taskId', async (req, res) => {
  const { taskId } = req.params

  if (!isValidId(taskId)) {
    return res.status(400).json({
      error: 'Invalid task ID',
      message: 'Task ID must be a positive integer.',
    })
  }

  try {
    const [result] = await pool.execute(
      'DELETE FROM tasks WHERE id = ?',
      [taskId],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Task not found',
        message: 'The task could not be found.',
      })
    }

    return res.status(204).end()
  } catch (error) {
    console.error('Failed to delete task:', error.message)
    return res.status(500).json({
      error: 'Task deletion failed',
      message: 'The task could not be deleted from the database.',
    })
  }
})

app.use((_req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'No API route matches this request.',
  })
})

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})
