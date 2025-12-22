import React, { createContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { initialUsers } from "../utils/mockData.js";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]); // This will hold all users for the admin view

  useEffect(() => {
    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn("⚠️ Auth setup timed out, forcing loading to false");
      setLoading(false);
    }, 15000); // 15 seconds timeout (aumentado de 5s)

    const setupAuth = async () => {
      console.log("🔄 Iniciando configuración de autenticación...");
      console.log("🔗 Supabase conectado:", !!supabase);
      console.log("🚀 MODO SUPABASE ACTIVADO");

      try {
        // MODO SUPABASE ACTIVADO
        if (supabase) {
          // MODO SUPABASE - Verificar sesión inicial
          console.log("📡 Verificando sesión inicial...");
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            console.error("❌ Error obteniendo sesión:", sessionError);
            throw sessionError;
          }

          if (session?.user) {
            console.log("👤 Usuario encontrado en sesión:", session.user.email);
            await handleUserSession(session);
          } else {
            console.log("🚫 No hay sesión activa");
            setCurrentUser(null);
            setUsers([]);
          }

          // Configurar listener para cambios de autenticación
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(
              "🔄 Cambio de autenticación:",
              event,
              session?.user?.email
            );
            if (session?.user) {
              await handleUserSession(session);
            } else {
              setCurrentUser(null);
              setUsers([]);
            }
          });

          setLoading(false);
          clearTimeout(timeoutId); // Limpiar timeout cuando termine exitosamente
          return () => subscription?.unsubscribe();
        } else {
          // MODO SIMULADO (FALLBACK)
          console.log("🎭 Iniciando en modo simulado...");
          try {
            const storedUser = localStorage.getItem("currentUser");
            if (storedUser) {
              const parsedUser = JSON.parse(storedUser);
              console.log(
                "👤 Usuario cargado desde localStorage:",
                parsedUser.nombre
              );
              setCurrentUser(parsedUser);
            } else {
              console.log("🆕 No hay usuario guardado, usando datos iniciales");
            }
            setUsers(initialUsers);
          } catch (e) {
            console.error("❌ Error al leer el usuario de localStorage", e);
            localStorage.removeItem("currentUser");
            setUsers(initialUsers);
          }
          setLoading(false);
          clearTimeout(timeoutId); // Limpiar timeout cuando termine exitosamente
        }
      } catch (error) {
        console.error("💥 Error crítico en setupAuth:", error);
        // Fallback a modo simulado en caso de error
        console.log("🔄 Fallback a modo simulado por error...");
        setUsers(initialUsers);
        setLoading(false);
        clearTimeout(timeoutId); // Limpiar timeout cuando termine con error
      }
    };

    // Función auxiliar para manejar sesiones de usuario
    const handleUserSession = async (session) => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.error("❌ Error obteniendo perfil:", profileError.message);
          // En lugar de cerrar sesión, crear perfil por defecto
          const defaultProfile = {
            id: session.user.id,
            nombre:
              session.user.user_metadata?.full_name ||
              session.user.email?.split("@")[0] ||
              "Usuario",
            usuario: session.user.email,
            user_rol: "finanzas",
            estado: "activo",
          };
          console.log("🔧 Usando perfil por defecto:", defaultProfile.nombre);
          setCurrentUser({ ...session.user, ...defaultProfile });
          setUsers([]);
        } else {
          console.log("✅ Perfil cargado correctamente:", profile.nombre);

          // Map DB 'rol' to 'user_rol' which the app expects
          const profileWithRole = {
            ...profile,
            user_rol: profile.user_rol || profile.rol
          };

          const fullUser = { ...session.user, ...profileWithRole };
          setCurrentUser(fullUser);

          if (fullUser.user_rol === "admin") {
            console.log("👑 Usuario admin, cargando lista de usuarios...");
            const { data: allUsersData, error: usersError } =
              await supabase.rpc("get_all_users_with_details");
            if (usersError) {
              console.error("❌ Error cargando usuarios:", usersError.message);
              setUsers([]);
            } else {
              console.log("✅ Usuarios cargados:", allUsersData?.length || 0);
              setUsers(allUsersData || []);
            }
          } else {
            console.log("ℹ️ Usuario con rol:", fullUser.user_rol, "- No cargando lista de usuarios");
            setUsers([]);
          }
        }
      } catch (error) {
        console.error("💥 Error en handleUserSession:", error);
        setCurrentUser(null);
        setUsers([]);
      }
    };

    setupAuth();

    return () => clearTimeout(timeoutId);
  }, []);

  const login = async (email, password) => {
    console.log("🔐 Intento de login:", email);

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("❌ Error de login:", error.message);
        return { data: null, error };
      }

      console.log("✅ Login exitoso:", data.user.email);
      return { data, error: null };
    } else {
      // Modo simulado
      const user = initialUsers.find(
        (u) =>
          (u.usuario === email || u.email === email) && u.password === password
      );

      if (user) {
        console.log("✅ Login exitoso (simulado):", user.nombre);
        setCurrentUser(user);
        localStorage.setItem("currentUser", JSON.stringify(user));
        return { data: { user }, error: null };
      } else {
        const userExists = initialUsers.find(
          (u) => u.usuario === email || u.email === email
        );
        const errorMsg = userExists
          ? "Contraseña incorrecta."
          : "Usuario no encontrado.";
        console.log("❌ Login fallido:", errorMsg);
        return { data: null, error: { message: errorMsg } };
      }
    }
  };

  const logout = async () => {
    console.log("🚪 Cerrando sesión...");

    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("❌ Error al cerrar sesión:", error.message);
      }
    } else {
      setCurrentUser(null);
      localStorage.removeItem("currentUser");
    }
  };

  const register = async (fullName, email, password) => {
    console.log("📝 Intento de registro:", fullName, email);

    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error("❌ Error de registro:", error.message);
        return { data: null, error };
      }

      console.log("✅ Registro exitoso:", data.user?.email);
      return { data, error: null };
    } else {
      // Modo simulado
      const existingUser = users.find(
        (u) => u.usuario === email.split("@")[0] || u.email === email
      );
      if (existingUser) {
        return {
          data: null,
          error: { message: "El usuario o correo electrónico ya existe." },
        };
      }

      console.log("✅ Registro simulado exitoso");
      return { data: { user: {} }, error: null };
    }
  };

  const updateUserProfile = async (userId, updates) => {
    console.log("🔄 Actualizando perfil:", userId, updates);

    if (supabase) {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) {
        console.error("❌ Error actualizando perfil:", error.message);
        return { error };
      }

      console.log("✅ Perfil actualizado exitosamente");

      // Actualizar la lista de usuarios si es admin
      if (currentUser?.user_rol === "admin") {
        const { data: allUsersData } = await supabase.rpc("get_all_users_with_details");
        if (allUsersData) {
          setUsers(allUsersData);
        }
      }

      return { error: null };
    } else {
      // Modo simulado
      const updatedMockUsers = users.map((u) =>
        u.id === userId ? { ...u, ...updates } : u
      );
      setUsers(updatedMockUsers);
      return { error: null };
    }
  };

  const value = {
    currentUser,
    loading,
    login,
    logout,
    register,
    users,
    updateUserProfile,
  };

  console.log(
    "🎭 AuthContext renderizando. Loading:",
    loading,
    "CurrentUser:",
    currentUser?.nombre
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
