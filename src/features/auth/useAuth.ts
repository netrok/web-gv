import { useAuthContext } from './AuthProvider'
export default function useAuth() {
  return useAuthContext()
}
