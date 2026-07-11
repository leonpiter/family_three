import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { captureRecoveryFromUrl } from './lib/recovery'
import './styles/index.css'

// Токены восстановления пароля приходят в hash — забираем их ДО монтирования
// HashRouter, иначе он примет «#access_token=…» за маршрут.
captureRecoveryFromUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
