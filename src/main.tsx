import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import App from './App.tsx'
import './index.css'
import { store } from './redux/store'
import ErrorBoundary from './components/common/ErrorBoundary'
import MyFallbackComponent from './components/common/MyFallbackComponent'
import '../public/assets/css/custom.css'



createRoot(document.getElementById("root")!).render(
  <ErrorBoundary fallback={MyFallbackComponent}>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </ErrorBoundary>
);
