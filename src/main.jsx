import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

const style = document.createElement('style')
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #090E1A; color: #E8EDF5; font-family: 'IBM Plex Mono', 'Courier New', monospace; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,212,255,0.2); border-radius: 2px; }
`
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
