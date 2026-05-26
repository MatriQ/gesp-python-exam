import { BrowserRouter, Routes, Route } from 'react-router-dom';

function HomePage() {
  return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <h1 className="text-4xl font-bold text-blue-600">GESP Python 练习</h1>
  </div>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
