import { useState, useEffect } from 'react'
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
    if (e.target.closest('.delete-btn')) return // Löschen-Button nicht blockieren
    
    setTouchStartNote(note)
    setTouchStartY(e.touches[0].clientY)
    setDraggedNote(note)
  }

  const handleTouchMove = (e, note) => {
    if (!touchStartNote) return
    
    const currentY = e.touches[0].clientY
    const diff = Math.abs(currentY - touchStartY)
    
    // Wenn Bewegung > 15px, dann als Drag aktivieren
    if (diff > 15) {
      if (note.id !== touchStartNote.id) {
        setTouchCurrentNote(note)
      }
    }
  }

  const handleTouchEnd = (e, targetNote) => {
    if (!touchStartNote || !touchCurrentNote) {
      setTouchStartNote(null)
      setTouchCurrentNote(null)
      setDraggedNote(null)
      setDragOverNote(null)
      return
    }

    if (touchStartNote.id === targetNote.id) {
      setTouchStartNote(null)
      setTouchCurrentNote(null)
      setDraggedNote(null)
      setDragOverNote(null)
      return
    }

    // Gleiche Logik wie Drop
    const updatedNotes = [...notes]
    const draggedIndex = updatedNotes.findIndex(n => n.id === touchStartNote.id)
    const targetIndex = updatedNotes.findIndex(n => n.id === targetNote.id)

    const [removed] = updatedNotes.splice(draggedIndex, 1)
    updatedNotes.splice(targetIndex, 0, removed)

    const reorderedNotes = updatedNotes.map((note, index) => ({
      ...note,
      order: index
    }))

    setNotes(reorderedNotes)
    setTouchStartNote(null)
    setTouchCurrentNote(null)
    setDraggedNote(null)
    setDragOverNote(null)
  }

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

      <main className="main">
        <div className="notes-container">
          {sortedNotes.map((note) => (
            <div
              key={note.id}
              className={`note-item ${note.completed ? 'completed' : ''} ${
                touchCurrentNote?.id === note.id ? 'drag-over' : ''
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, note)}
              onDragOver={(e) => handleDragOver(e, note)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, note)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, note)}
              onTouchMove={(e) => handleTouchMove(e, note)}
              onTouchEnd={(e) => handleTouchEnd(e, note)}
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
