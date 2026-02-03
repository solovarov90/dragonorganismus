import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LeadMagnets from './pages/LeadMagnets';
import ContextEditor from './pages/ContextEditor';
import Logs from './pages/Logs';
import Broadcasts from './pages/Broadcasts';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="lead-magnets" element={<LeadMagnets />} />
          <Route path="context" element={<ContextEditor />} />
          <Route path="logs" element={<Logs />} />
          <Route path="broadcasts" element={<Broadcasts />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
