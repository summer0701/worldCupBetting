import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import MyPage from './pages/MyPage';
import RankingPage from './pages/RankingPage';
import AdminPage from './pages/AdminPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/my" element={<MyPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
