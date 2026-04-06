import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// CSS imports — exact same order as original <link> tags in index.html
import './css/fonts.css'
import './css/shared.css'
import './css/header.css'
import './css/footer.css'
import './css/burger-menu.css'
import './css/loading-line.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
