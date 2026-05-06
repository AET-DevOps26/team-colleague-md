import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('Loading...')

  useEffect(() => {
    fetch('http://localhost:8081/health')
      .then(res => res.text())
      .then(data => setMessage(data))
      .catch(err => setMessage('Error fetching from User Service: ' + err.message))
  }, [])

  return (
    <div className="App">
      <h1>Verita Frontend</h1>
      <div className="card">
        <p>Message from backend:</p>
        <h2>{message}</h2>
      </div>
    </div>
  )
}

export default App
