import {initializeTheme} from './components/common/ThemeToggle';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/commissioner-insight.css';
import './styles/commissioner-overview.css';
import './styles/inspection-targets.css';
import './styles/insight-history-map.css';

import './styles/themes.css';
initializeTheme();
createRoot(document.getElementById('root')!).render(<App />);
import './styles/ulb-dashboard.css';
