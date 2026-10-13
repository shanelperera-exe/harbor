import { Navigate } from 'react-router-dom';

export default function CreateAccount() {
  // Public self-registration is disabled for the Harbor Admin Portal.
  // Administrative accounts are created by system provisioners.
  return <Navigate to="/login" replace />;
}
