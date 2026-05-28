import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { QuestionBank } from './pages/QuestionBank';
import { Practice } from './pages/Practice';
import { QuestionDetail } from './pages/QuestionDetail';
import { Dashboard } from './pages/Dashboard';
import { ErrorBook } from './pages/ErrorBook';
import { ExamEntry } from './pages/ExamEntry';
import { ExamActive } from './pages/ExamActive';
import { CodeEditor } from './pages/CodeEditor';
import { ExamResult } from './pages/ExamResult';
import { AdminDashboard } from './pages/AdminDashboard';
import { GameLayout } from './game/components/GameLayout';
import { GameHome } from './game/pages/GameHome';
import { MapExploration } from './game/pages/MapExploration';
import { StagePlay } from './game/pages/StagePlay';
import { BossStage } from './game/pages/BossStage';
import { Leaderboard } from './game/pages/Leaderboard';
import { RpgProfile } from './game/pages/RpgProfile';
import { StoryChapters } from './game/pages/StoryChapters';
import { StoryScene } from './game/pages/StoryScene';
import { GameOnboarding } from './game/pages/GameOnboarding';
import { useAuthStore } from './stores/authStore';

function App() {
  const initAuth = useAuthStore((s) => s.initAuth);
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/exam" element={<ExamEntry />} />
        <Route path="/exam/:id" element={<ExamActive />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/questions" element={<QuestionBank />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/questions/:id" element={<QuestionDetail />} />
          <Route path="/progress" element={<Dashboard />} />
          <Route path="/errors" element={<ErrorBook />} />
          <Route path="/code/:id" element={<CodeEditor />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
        <Route path="/game" element={<GameLayout />}>
          <Route index element={<GameHome />} />
          <Route path="onboarding" element={<GameOnboarding />} />
          <Route path="map" element={<MapExploration />} />
          <Route path="map/stage/:stageId" element={<StagePlay />} />
          <Route path="map/boss/:stageId" element={<BossStage />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="rpg" element={<RpgProfile />} />
          <Route path="story" element={<StoryChapters />} />
          <Route path="story/chapter/:chapterId" element={<StoryScene />} />
        </Route>
        <Route path="/exam/:id/result" element={<ExamResult />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
