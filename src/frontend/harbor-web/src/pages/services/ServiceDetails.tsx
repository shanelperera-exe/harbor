import { Routes, Route, Navigate } from 'react-router-dom';
import ServiceDeploys from './ServiceDeploys';

export default function ServiceDetails() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="deploys" replace />} />
      <Route path="deploys" element={<ServiceDeploys />} />
    </Routes>
  );
}
