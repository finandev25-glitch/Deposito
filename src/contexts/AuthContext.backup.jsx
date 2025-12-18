import React, { createContext, useState, useEffect } from "react";
import { initialUsers } from "../utils/mockData.js";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    console.log("🎭 MODO SIMULADO FORZADO - Inicializando...");

    // Simular carga por 1 segundo
    setTimeout(() => {
      try {
        // Intentar cargar usuario de localStorage
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          console.log(
            "👤 Usuario cargado desde localStorage:",
            parsedUser.nombre
          );
          setCurrentUser(parsedUser);
        } else {
          // Si no hay usuario guardado, usar el admin por defecto
          const defaultUser = initialUsers[0]; // Ana García (admin)
          console.log("🆕 Usando usuario por defecto:", defaultUser.nombre);
          setCurrentUser(defaultUser);
          localStorage.setItem("currentUser", JSON.stringify(defaultUser));
        }

        setUsers(initialUsers);
        console.log("✅ Inicialización completa en modo simulado");
      } catch (error) {
        console.error("❌ Error en inicialización:", error);
        // Usuario de emergencia
        const emergencyUser = {
          id: 1,
          nombre: "Usuario de Emergencia",
          usuario: "emergency",
          rol: "admin",
          estado: "activo",
          email: "emergency@test.com",
        };
        setCurrentUser(emergencyUser);
        setUsers([emergencyUser]);
      } finally {
        setLoading(false);
      }
    }, 1000);
  }, []);

  const login = async (email, password) => {
    console.log("🔐 Intento de login:", email);

    // Buscar usuario por email o usuario
    const user = initialUsers.find(
      (u) =>
        (u.usuario === email || u.email === email) && u.password === password
    );

    if (user) {
      console.log("✅ Login exitoso:", user.nombre);
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
  };

  const logout = async () => {
    console.log("🚪 Cerrando sesión...");
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
  };

  const register = async (fullName, email, password) => {
    console.log("📝 Intento de registro:", fullName, email);

    const existingUser = users.find(
      (u) => u.usuario === email.split("@")[0] || u.email === email
    );
    if (existingUser) {
      return {
        data: null,
        error: { message: "El usuario o correo electrónico ya existe." },
      };
    }

    // Simular registro exitoso
    console.log("✅ Registro simulado exitoso");
    return { data: { user: {} }, error: null };
  };

  const updateUserProfile = async (userId, updates) => {
    console.log("🔄 Actualizando perfil:", userId, updates);
    const updatedMockUsers = users.map((u) =>
      u.id === userId ? { ...u, ...updates } : u
    );
    setUsers(updatedMockUsers);
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
