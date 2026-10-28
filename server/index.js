import express from 'express'
import pool from './db.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const defaultColumns = ['To-do', 'In progress', 'Done']

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid port number between 1 and 65535.')
}

app.use(express.json({ limit: '100kb' }))

function notImplemented(res, operation) {
  return res.status(501).json({
    error: 'Not implemented',
    message: `${operation} is not implemented yet.`,
  })
}

app.get('/board', (_req, res) => notImplemented(res, 'Getting the board'))

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

app.post('/board/:boardId/tasks', (_req, res) =>
  notImplemented(res, 'Creating a task'),
)
app.patch('/tasks/:taskId/status', (_req, res) =>
  notImplemented(res, 'Changing task status'),
)
app.delete('/tasks/:taskId', (_req, res) =>
  notImplemented(res, 'Deleting a task'),
)

app.use((_req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'No API route matches this request.',
  })
})

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})
