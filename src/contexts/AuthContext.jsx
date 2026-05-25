import React, { createContext, useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiPut } from "../services/backendApi.js";

export const AuthContext = createContext();

const SESSION_KEY = "control-depositos-auth-session";
const CURRENT_USER_KEY = "control-depositos-current-user";

function readStoredJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`No se pudo leer ${key}:`, error);
    return null;
  }
}

function writeStoredJSON(key, value) {
  try {
    if (value == null) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`No se pudo guardar ${key}:`, error);
  }
}

function clearStoredAuth() {
  writeStoredJSON(SESSION_KEY, null);
  writeStoredJSON(CURRENT_USER_KEY, null);
}

function normalizeUserFromAuth(authUser, profile = {}, fallbackEmail = "") {
  const email = profile.email || authUser?.email || fallbackEmail || "";
  const metadata = authUser?.user_metadata || {};
  const fullName =
    profile.nombre ||
    profile.full_name ||
    metadata.full_name ||
    metadata.nombre ||
    metadata.name ||
    email.split("@")[0] ||
    "Usuario";

  const role =
    profile.user_rol ||
    profile.rol ||
    metadata.user_rol ||
    metadata.rol ||
    metadata.role ||
    "finanzas";

  return {
    id: profile.id || authUser?.id || email,
    nombre: fullName,
    usuario: profile.usuario || metadata.usuario || email.split("@")[0] || email,
    email,
    user_rol: role,
    rol: role,
    estado: profile.estado || metadata.estado || "activo",
    last_sign_in_at:
      profile.last_sign_in_at || authUser?.last_sign_in_at || null,
    created_at: profile.created_at || authUser?.created_at || null,
    updated_at: profile.updated_at || authUser?.updated_at || null,
    rawProfile: profile,
    rawAuthUser: authUser,
  };
}

function normalizeUsersList(rows = [], currentUser = null) {
  const mapped = rows.map((row) => {
    const role = row.user_rol || row.rol || row.role || "finanzas";
    const email = row.email || row.usuario || "";
    return {
      ...row,
      nombre:
        row.nombre ||
        row.full_name ||
        row.user_metadata?.full_name ||
        email.split("@")[0] ||
        "Usuario",
      usuario:
        row.usuario ||
        row.username ||
        row.email ||
        email.split("@")[0] ||
        "",
      email,
      user_rol: role,
      rol: role,
      estado: row.estado || "activo",
    };
  });

  if (
    currentUser &&
    !mapped.some((item) => String(item.id) === String(currentUser.id))
  ) {
    mapped.unshift(currentUser);
  }

  return mapped;
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [authSession, setAuthSession] = useState(null);

  const hydrateCurrentUser = async (authUser, fallbackSession) => {
    if (!authUser) {
      setCurrentUser(null);
      setUsers([]);
      setAuthSession(null);
      clearStoredAuth();
      return null;
    }

    let profile = null;
    try {
      const profileResponse = await apiGet(`/users/${authUser.id}/profile`);
      profile = profileResponse?.data || null;
    } catch (error) {
      console.warn("Perfil no disponible, usando datos del auth user:", error);
    }

    const normalizedUser = normalizeUserFromAuth(
      authUser,
      profile || {},
      authUser?.email || ""
    );

    setCurrentUser(normalizedUser);
    setAuthSession(fallbackSession || null);
    writeStoredJSON(CURRENT_USER_KEY, normalizedUser);
    if (fallbackSession) {
      writeStoredJSON(SESSION_KEY, fallbackSession);
    }

    try {
      const detailsResponse = await apiGet("/users/details");
      const mappedUsers = normalizeUsersList(detailsResponse?.data || [], normalizedUser);
      setUsers(mappedUsers);
    } catch (error) {
      console.warn("No se pudo cargar la lista de usuarios:", error);
      setUsers([normalizedUser]);
    }

    return normalizedUser;
  };

  const restoreSession = async () => {
    const storedSession = readStoredJSON(SESSION_KEY);

    if (!storedSession?.access_token) {
      clearStoredAuth();
      setCurrentUser(null);
      setUsers([]);
      setAuthSession(null);
      setLoading(false);
      return;
    }

    try {
      const meResponse = await apiPost("/auth/me", {
        accessToken: storedSession.access_token,
      });
      const authUser = meResponse?.data?.user || meResponse?.data || null;

      if (!authUser) {
        throw new Error("Sesión inválida");
      }

      await hydrateCurrentUser(authUser, storedSession);
    } catch (error) {
      console.warn("No se pudo restaurar la sesión:", error);
      clearStoredAuth();
      setCurrentUser(null);
      setUsers([]);
      setAuthSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!active) return;
      await restoreSession();
    };

    run();

    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await apiPost("/auth/login", { email, password });
      const session = response?.data?.session || null;
      const authUser = response?.data?.user || null;

      if (!session || !authUser) {
        throw new Error("No se pudo iniciar sesión");
      }

      clearStoredAuth();
      await hydrateCurrentUser(authUser, session);
      return { data: { user: authUser, session }, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  };

  const logout = async () => {
    try {
      await apiPost("/auth/logout", {});
    } catch (error) {
      console.warn("Logout backend falló:", error);
    } finally {
      clearStoredAuth();
      setCurrentUser(null);
      setUsers([]);
      setAuthSession(null);
    }
  };

  const register = async (fullName, email, password) => {
    try {
      const response = await apiPost("/auth/register", {
        fullName,
        email,
        password,
      });

      return { data: response?.data || null, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  };

  const updateUserProfile = async (userId, updates) => {
    try {
      const response = await apiPut(`/users/${userId}/profile`, updates);
      const updatedProfile = response?.data || null;

      if (!updatedProfile) {
        throw new Error("No se recibió el perfil actualizado");
      }

      const mergedUser = normalizeUserFromAuth(
        currentUser?.rawAuthUser || null,
        { ...currentUser?.rawProfile, ...updatedProfile },
        currentUser?.email || ""
      );

      setUsers((prev) =>
        normalizeUsersList(
          prev.map((user) =>
            String(user.id) === String(userId)
              ? { ...user, ...updatedProfile, ...mergedUser }
              : user
          ),
          mergedUser
        )
      );

      if (String(currentUser?.id) === String(userId)) {
        setCurrentUser(mergedUser);
        writeStoredJSON(CURRENT_USER_KEY, mergedUser);
      }

      return updatedProfile;
    } catch (error) {
      console.error("Error actualizando perfil:", error);
      throw error;
    }
  };

  const refreshUsers = useCallback(async () => {
    try {
      const response = await apiGet("/users/details");
      const mappedUsers = normalizeUsersList(response?.data || [], currentUser);
      setUsers(mappedUsers);
      return mappedUsers;
    } catch (error) {
      console.warn("No se pudo refrescar la lista de usuarios:", error);
      return [];
    }
  }, [currentUser]);

  const value = {
    currentUser,
    loading,
    login,
    logout,
    register,
    users,
    updateUserProfile,
    refreshUsers,
    authSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
