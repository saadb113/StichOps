import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './styles/theme-elegant.css'
import App from './App.jsx'
import { AppStateProvider } from './store/AppStateContext.jsx'
import { UiProvider } from './store/UiContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppStateProvider>
        <UiProvider>
          <App />
        </UiProvider>
      </AppStateProvider>
    </BrowserRouter>
  </StrictMode>,
)
