import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  // Lade Notizen und Titel direkt aus localStorage beim Initialisieren
  const [notes, setNotes] = useState(() => {
    const savedNotes = localStorage.getItem('notes')
    return savedNotes ? JSON.parse(savedNotes) : []
  })
  
  const [newNoteText, setNewNoteText] = useState('')
  const [draggedNote, setDraggedNote] = useState(null)
  const [dragOverNote, setDragOverNote] = useState(null)
  
  const [title, setTitle] = useState(() => {
    const savedTitle = localStorage.getItem('title')
    return savedTitle || 'Meine Notizen'
  })
  
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(title)
  const [touchStartNote, setTouchStartNote] = useState(null)
  const [touchStartY, setTouchStartY] = useState(0)
  const [touchCurrentNote, setTouchCurrentNote] = useState(null)
  const [isTouchDragging, setIsTouchDragging] = useState(false)
  const mainScrollRef = useRef(null)
  const touchPositionRef = useRef({ x: 0, y: 0 })
  const autoScrollRafRef = useRef(null)

  const getScrollContainer = () => {
    const container = mainScrollRef.current
    if (container && container.scrollHeight > container.clientHeight) return container
    return document.scrollingElement || document.documentElement
  }

  // Speichere Notizen in localStorage bei Änderungen
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem('notes', JSON.stringify(notes))
    }
  }, [notes])

  // Speichere Titel in localStorage bei Änderungen
  useEffect(() => {
    localStorage.setItem('title', title)
  }, [title])

  // Sortiere Notizen: unerledigte zuerst, dann erledigte
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.completed === b.completed) return a.order - b.order
    return a.completed ? 1 : -1
  })

  // Neue Notiz hinzufügen
  const addNote = () => {
    if (newNoteText.trim() === '') return
    
    const newNote = {
      id: Date.now(),
      text: newNoteText,
      completed: false,
      order: notes.length
    }
    
    setNotes([...notes, newNote])
    setNewNoteText('')
  }

  // Notiz als erledigt/unerledigt markieren
  const toggleNote = (id) => {
    setNotes(notes.map(note => {
      if (note.id === id) {
        return { ...note, completed: !note.completed }
      }
      return note
    }))
  }

  // Notiz löschen
  const deleteNote = (id) => {
    setNotes(notes.filter(note => note.id !== id))
  }

  // Drag & Drop Handler
  const handleDragStart = (e, note) => {
    setDraggedNote(note)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, note) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    if (note.id !== draggedNote?.id) {
      setDragOverNote(note)
    }
  }

  const handleDragLeave = () => {
    setDragOverNote(null)
  }

  const handleDrop = (e, targetNote) => {
    e.preventDefault()
    setDragOverNote(null)

    if (!draggedNote || draggedNote.id === targetNote.id) return

    // Reorganisiere die Notizen
    const updatedNotes = [...notes]
    const draggedIndex = updatedNotes.findIndex(n => n.id === draggedNote.id)
    const targetIndex = updatedNotes.findIndex(n => n.id === targetNote.id)

    // Entferne die gezogene Notiz
    const [removed] = updatedNotes.splice(draggedIndex, 1)
    
    // Füge sie an der neuen Position ein
    updatedNotes.splice(targetIndex, 0, removed)

    // Update order property
    const reorderedNotes = updatedNotes.map((note, index) => ({
      ...note,
      order: index
    }))

    setNotes(reorderedNotes)
    setDraggedNote(null)
  }

  const handleDragEnd = () => {
    setDraggedNote(null)
    setDragOverNote(null)
  }

  // Touch Events für Smartphone-Support
  const handleTouchStart = (e, note) => {
    if (e.target.closest('.delete-btn') || e.target.closest('.checkbox')) return
    
    // Verhindere Text-Selektion und Scrolling sofort
    e.preventDefault()
    
    const touch = e.touches[0]
    touchPositionRef.current = { x: touch.clientX, y: touch.clientY }

    setTouchStartNote(note)
    setTouchStartY(e.touches[0].clientY)
    setDraggedNote(note)
    setTouchCurrentNote(null)
    setIsTouchDragging(false)
  }

  const handleTouchMove = (e) => {
    if (!touchStartNote) return
    
    // Immer preventDefault aufrufen wenn ein Drag aktiv ist
    e.preventDefault()
    
    const touch = e.touches[0]
    touchPositionRef.current = { x: touch.clientX, y: touch.clientY }
    const currentY = touch.clientY
    const diff = Math.abs(currentY - touchStartY)

    // Wenn Bewegung > 10px, dann als Drag aktivieren
    if (diff > 10) {
      if (!isTouchDragging) setIsTouchDragging(true)
      // Finde die Note unter dem Touch-Punkt
      const element = document.elementFromPoint(touch.clientX, touch.clientY)
      const noteElement = element?.closest('.note-item')
      
      if (noteElement) {
        const noteId = Number(noteElement.getAttribute('data-note-id'))
        const targetNote = notes.find(n => n.id === noteId)
        
        if (targetNote && targetNote.id !== touchStartNote.id) {
          setTouchCurrentNote(targetNote)
        }
      }
    }
  }

  const handleTouchEnd = () => {
    if (!touchStartNote) {
      setTouchStartNote(null)
      setTouchCurrentNote(null)
      setDraggedNote(null)
      setIsTouchDragging(false)
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current)
        autoScrollRafRef.current = null
      }
      return
    }

    if (isTouchDragging && touchCurrentNote && touchCurrentNote.id !== touchStartNote.id) {
      // Führe Reordering durch
      const updatedNotes = [...notes]
      const draggedIndex = updatedNotes.findIndex(n => n.id === touchStartNote.id)
      const targetIndex = updatedNotes.findIndex(n => n.id === touchCurrentNote.id)

      const [removed] = updatedNotes.splice(draggedIndex, 1)
      updatedNotes.splice(targetIndex, 0, removed)

      const reorderedNotes = updatedNotes.map((note, index) => ({
        ...note,
        order: index
      }))

      setNotes(reorderedNotes)
    }

    setTouchStartNote(null)
    setTouchCurrentNote(null)
    setDraggedNote(null)
    setIsTouchDragging(false)
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current)
      autoScrollRafRef.current = null
    }
  }

  useEffect(() => {
    if (!touchStartNote) return

    const step = () => {
      if (!isTouchDragging) {
        autoScrollRafRef.current = requestAnimationFrame(step)
        return
      }

      const container = getScrollContainer()
      if (!container) {
        autoScrollRafRef.current = requestAnimationFrame(step)
        return
      }

      const { y } = touchPositionRef.current
      if (y == null) {
        autoScrollRafRef.current = requestAnimationFrame(step)
        return
      }

      const edgeThreshold = 60
      const scrollSpeed = 12

      let top = 0
      let bottom = window.innerHeight

      if (container !== document.scrollingElement && container !== document.documentElement && container !== document.body) {
        const rect = container.getBoundingClientRect()
        top = rect.top
        bottom = rect.bottom
      }

      if (y < top + edgeThreshold) {
        container.scrollTop = Math.max(0, container.scrollTop - scrollSpeed)
      } else if (y > bottom - edgeThreshold) {
        const maxScroll = container.scrollHeight - container.clientHeight
        container.scrollTop = Math.min(maxScroll, container.scrollTop + scrollSpeed)
      }

      autoScrollRafRef.current = requestAnimationFrame(step)
    }

    autoScrollRafRef.current = requestAnimationFrame(step)

    return () => {
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current)
        autoScrollRafRef.current = null
      }
    }
  }, [touchStartNote, isTouchDragging])

  useEffect(() => {
    if (!touchStartNote) return

    const onMove = (e) => handleTouchMove(e)
    const onEnd = () => handleTouchEnd()

    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)

    return () => {
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [touchStartNote, handleTouchMove, handleTouchEnd])

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addNote()
    }
  }

  // Titel-Editing Funktionen
  const startEditingTitle = () => {
    setIsEditingTitle(true)
    setTempTitle(title)
  }

  const saveTitle = () => {
    if (tempTitle.trim() !== '') {
      setTitle(tempTitle.trim())
    } else {
      setTempTitle(title)
    }
    setIsEditingTitle(false)
  }

  const handleTitleKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveTitle()
    } else if (e.key === 'Escape') {
      setTempTitle(title)
      setIsEditingTitle(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        {isEditingTitle ? (
          <input
            type="text"
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={handleTitleKeyPress}
            className="title-input"
            autoFocus
          />
        ) : (
          <h1 onDoubleClick={startEditingTitle} className="title-editable" title="Doppelklick zum Bearbeiten">
            {title}
          </h1>
        )}
        <div className="stats">
          <span>{notes.filter(n => !n.completed).length} offen</span>
          <span>{notes.filter(n => n.completed).length} erledigt</span>
        </div>
      </header>

      <main className="main" ref={mainScrollRef}>
        <div 
          className="notes-container"
        >
          {sortedNotes.map((note) => (
            <div
              key={note.id}
              data-note-id={note.id}
              className={`note-item ${note.completed ? 'completed' : ''} ${
                touchCurrentNote?.id === note.id ? 'drag-over' : ''
              } ${draggedNote?.id === note.id ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, note)}
              onDragOver={(e) => handleDragOver(e, note)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, note)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, note)}
            >
              <div className="note-content">
                <div 
                  className="checkbox"
                  onClick={() => toggleNote(note.id)}
                >
                  {note.completed && <span className="checkmark">✓</span>}
                </div>
                <p className="note-text">{note.text}</p>
                <button 
                  className="delete-btn"
                  onClick={() => deleteNote(note.id)}
                  title="Notiz löschen"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {notes.length === 0 && (
            <div className="empty-state">
              <p>Noch keine Notizen vorhanden.</p>
              <p>Füge deine erste Notiz unten hinzu!</p>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="input-container">
          <input
            type="text"
            placeholder="Neue Notiz eingeben..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            onKeyPress={handleKeyPress}
            className="note-input"
          />
          <button 
            onClick={addNote}
            className="add-btn"
            disabled={newNoteText.trim() === ''}
          >
            + Hinzufügen
          </button>
        </div>
      </footer>
    </div>
  )
}

export default App
