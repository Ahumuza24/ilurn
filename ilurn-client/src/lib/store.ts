import { create } from 'zustand';

export type UserRole = 'LEARNER' | 'ADMIN';

export interface AuthUser {
  user_id: number;
  name: string;
  email: string | null;
  role: UserRole;
  registration_id: string | null;
  age_group: string | null;
}

interface UserState {
  user_id: number | null;
  registration_id: string | null;
  age_group: string | null;
  session_id: number | null;
  name: string | null;
  email: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser) => void;
  setUser: (user: Partial<UserState>) => void;
  setSessionId: (id: number | null) => void;
  logout: () => void;
}

const STORAGE_KEY = 'ilurn_auth_user';

const emptyAuthState = {
  user_id: null,
  registration_id: null,
  age_group: null,
  session_id: null,
  name: null,
  email: null,
  role: null,
  isAuthenticated: false,
};

function loadStoredUser(): Partial<UserState> {
  if (typeof sessionStorage === 'undefined') return {};
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return {};

  try {
    const user = JSON.parse(stored) as AuthUser;
    return { ...user, session_id: null, isAuthenticated: true };
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return {};
  }
}

export const useUserStore = create<UserState>((set) => ({
  ...emptyAuthState,
  ...loadStoredUser(),
  setAuth: (user) => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
    set({ ...user, session_id: null, isAuthenticated: true });
  },
  setUser: (user) => set((state) => ({ ...state, ...user })),
  setSessionId: (id) => set({ session_id: id }),
  logout: () => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    set(emptyAuthState);
  }
}));
