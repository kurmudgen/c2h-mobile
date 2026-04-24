import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

// Auto-signs in with the test candidate account in DEV mode.
// Toggle ROLE to 'employer' to test the employer flow.
const ROLE: 'candidate' | 'employer' = 'candidate';
const CREDS = {
  candidate: { email: 'test-candidate@cleared2hire.dev', password: 'TestPass123!' },
  employer:  { email: 'test-employer@cleared2hire.dev',  password: 'TestPass123!' },
};

export default function DevAutoLogin() {
  const { session, signIn } = useAuth();

  useEffect(() => {
    if (!__DEV__ || session) return;
    const { email, password } = CREDS[ROLE];
    signIn(email, password);
  }, []);

  return null;
}
