import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainApp from './MainApp'
import Register from './screens/Register'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/registro/:code" element={<Register />} />
      </Routes>
    </BrowserRouter>
  )
}
