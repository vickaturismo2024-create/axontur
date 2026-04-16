import { Navigate } from 'react-router-dom';

// Legacy route — now redirects to Settings > Agency tab.
const Agency = () => <Navigate to="/settings?tab=agency" replace />;

export default Agency;
