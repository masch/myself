import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useSQLiteContext } from "expo-sqlite";
import { getUsers, getUserById, createUser, type User } from "@/db/database";

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isLoadingAuth: boolean;
  switchUser: (id: string) => Promise<void>;
  registerUser: (name: string, email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const loadAuth = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      const allUsers = await getUsers(db);
      setUsers(allUsers);
      if (allUsers.length > 0) {
        setCurrentUser((prev) => prev ?? allUsers[0]);
      }
    } catch (error) {
      console.error("Failed to load auth users:", error);
    } finally {
      setIsLoadingAuth(false);
    }
  }, [db]);

  useEffect(() => {
    let isMounted = true;

    async function fetchInitialUsers() {
      try {
        const allUsers = await getUsers(db);
        if (isMounted) {
          setUsers(allUsers);
          if (allUsers.length > 0) {
            setCurrentUser((prev) => prev ?? allUsers[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load auth users:", error);
      } finally {
        if (isMounted) {
          setIsLoadingAuth(false);
        }
      }
    }

    void fetchInitialUsers();

    return () => {
      isMounted = false;
    };
  }, [db]);

  const switchUser = async (id: string) => {
    const user = await getUserById(db, id);
    if (user) {
      setCurrentUser(user);
    }
  };

  const registerUser = async (name: string, email: string) => {
    const newId = await createUser(db, name, email);
    await loadAuth();
    await switchUser(newId);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isLoadingAuth,
        switchUser,
        registerUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
