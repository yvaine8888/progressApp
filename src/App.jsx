import { useEffect, useRef, useState } from 'react'
import './App.css'

const defaultColumns = ['To-do', 'In progress', 'Done']

function App() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [boardTitle, setBoardTitle] = useState('')
  const [columns, setColumns] = useState(defaultColumns)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [homeStatus, setHomeStatus] = useState('')
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
    setHomeStatus('')
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
      setHomeStatus(`“${result.title || boardTitle.trim()}” was created successfully.`)
    } catch {
      setMessage('Could not reach the server. Check your connection and try again.')
    } finally {
      setIsSubmitting(false)
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
        <a className="brand" href="/" aria-label="Dayboard home">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>dayboard</span>
        </a>
        <span className="topbar-note">A little more focus, every day.</span>
      </header>

      <section className="home-content" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <span className="eyebrow">YOUR SPACE TO MAKE PROGRESS</span>
          <h1 id="welcome-title">Make room for what matters.</h1>
          <p>Bring your tasks, plans, and next steps together in one calm place.</p>
        </div>

        <button className="add-board-card" type="button" onClick={openDialog}>
          <span className="add-board-icon" aria-hidden="true">+</span>
          <span className="add-board-label">Add a board</span>
          <span className="add-board-hint">Start with a title and your columns</span>
        </button>
        {homeStatus && (
          <p className="home-status" role="status">{homeStatus}</p>
        )}

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
                onClick={closeDialog}
                disabled={isSubmitting}
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
                id="board-title"
                maxLength={120}
                disabled={isSubmitting}
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
                      maxLength={80}
                      disabled={isSubmitting}
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
    </main>
  )
}

export default App
