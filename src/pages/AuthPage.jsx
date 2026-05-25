import React, { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../contexts/AuthContext";
import {
  ShieldCheck,
  User,
  Lock,
  UserPlus,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter.jsx";

// Componentes de formulario extraídos para evitar re-renderizados innecesarios
const InputField = ({
  name,
  type,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
}) => (
  <div>
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
    </label>
    <div className="relative mt-1">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-shadow"
        required
      />
    </div>
  </div>
);

const PasswordField = ({
  name,
  value,
  onChange,
  showPassword,
  onToggleShowPassword,
}) => (
  <div>
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
      Contraseña
    </label>
    <div className="relative mt-1">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      <input
        name={name}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder="••••••••"
        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-shadow"
        required
      />
      <button
        type="button"
        onClick={onToggleShowPassword}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  </div>
);

const AuthPage = () => {
  const [viewMode, setViewMode] = useState("login"); // 'login', 'register', 'forgot'
  const { login, register } = useContext(AuthContext);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [forgotEmail, setForgotEmail] = useState("");

  const handleLoginChange = (e) =>
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  const handleRegisterChange = (e) =>
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);
    console.log(
      "🔐 Intentando login con:",
      loginData.email,
      "password:",
      loginData.password
    );
    const { error } = await login(loginData.email, loginData.password);
    if (error) {
      console.error("❌ Error en login:", error.message);
      setError(error.message);
    } else {
      console.log("✅ Login exitoso");
    }
    setIsLoading(false);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    if (
      !registerData.fullName ||
      !registerData.email ||
      !registerData.password
    ) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    setIsLoading(true);
    const { error } = await register(
      registerData.fullName,
      registerData.email,
      registerData.password
    );
    if (error) {
      setError(error.message);
    } else {
      setMessage(
        "¡Registro exitoso! Por favor, revisa tu correo para confirmar tu cuenta. Luego, un administrador deberá activar tu usuario."
      );
      setViewMode("login");
      setRegisterData({ fullName: "", email: "", password: "" });
    }
    setIsLoading(false);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!forgotEmail) {
      setError("Por favor, ingresa tu correo electrónico.");
      return;
    }
    setIsLoading(true);
    // Simulación por ahora
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setMessage(
      `Si existe una cuenta asociada a ${forgotEmail}, se ha enviado un enlace de recuperación.`
    );
    setIsLoading(false);
    setViewMode("login");
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
  };

  const renderContent = () => {
    switch (viewMode) {
      case "register":
        return (
          <motion.form
            key="register"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onSubmit={handleRegisterSubmit}
            className="space-y-5"
          >
            <h2 className="text-xl font-semibold text-center mb-2 dark:text-gray-100">
              Crear una cuenta
            </h2>
            <InputField
              name="fullName"
              type="text"
              label="Nombre Completo"
              icon={User}
              value={registerData.fullName}
              onChange={handleRegisterChange}
              placeholder="Ej: Ana García"
            />
            <InputField
              name="email"
              type="email"
              label="Correo Electrónico"
              icon={Mail}
              value={registerData.email}
              onChange={handleRegisterChange}
              placeholder="tu@correo.com"
            />
            <PasswordField
              name="password"
              value={registerData.password}
              onChange={handleRegisterChange}
              showPassword={showPassword}
              onToggleShowPassword={() => setShowPassword(!showPassword)}
            />
            <PasswordStrengthMeter password={registerData.password} />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:bg-blue-400"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <UserPlus size={14} />
              )}
              <span>{isLoading ? "Registrando..." : "Registrarse"}</span>
            </button>
          </motion.form>
        );
      case "forgot":
        return (
          <motion.form
            key="forgot"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onSubmit={handleForgotSubmit}
            className="space-y-5"
          >
            <h2 className="text-xl font-semibold text-center mb-2 dark:text-gray-100">
              Recuperar Contraseña
            </h2>
            <p className="text-sm text-center text-gray-600 dark:text-gray-400 -mt-2 mb-4">
              Ingresa tu correo para recibir un enlace de recuperación.
            </p>
            <InputField
              name="email"
              type="email"
              label="Correo Electrónico"
              icon={Mail}
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:bg-blue-400"
            >
              {isLoading && <Loader2 className="animate-spin" />}
              <span>{isLoading ? "Enviando..." : "Enviar Enlace"}</span>
            </button>
          </motion.form>
        );
      default: // login
        return (
          <motion.form
            key="login"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onSubmit={handleLoginSubmit}
            className="space-y-5"
          >
            <h2 className="text-xl font-semibold text-center mb-2 dark:text-gray-100">
              Iniciar Sesión
            </h2>
            <InputField
              name="email"
              type="email"
              label="Correo Electrónico"
              icon={Mail}
              value={loginData.email}
              onChange={handleLoginChange}
              placeholder="admin@empresa.com"
            />
            <PasswordField
              name="password"
              value={loginData.password}
              onChange={handleLoginChange}
              showPassword={showPassword}
              onToggleShowPassword={() => setShowPassword(!showPassword)}
            />

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600"></span>
              <button
                type="button"
                onClick={() => {
                  setViewMode("forgot");
                  clearMessages();
                }}
                className="font-medium text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:bg-blue-400"
            >
              {isLoading && <Loader2 className="animate-spin" />}
              <span>{isLoading ? "Ingresando..." : "Ingresar"}</span>
            </button>
          </motion.form>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-block bg-blue-600 p-4 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
            <ShieldCheck className="text-white" size={22} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Control de Depósitos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Bienvenido. Ingresa tus credenciales.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.p
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="text-sm text-red-600 dark:text-red-400 mt-4 text-center bg-red-50 dark:bg-red-900/30 p-3 rounded-lg"
              >
                {error}
              </motion.p>
            )}
            {message && (
              <motion.p
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="text-sm text-green-600 dark:text-green-300 mt-4 text-center bg-green-50 dark:bg-green-900/30 p-3 rounded-lg"
              >
                {message}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="text-center mt-6">
            {viewMode === "login" && (
              <button
                onClick={() => {
                  setViewMode("register");
                  clearMessages();
                }}
                className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                ¿No tienes una cuenta? Regístrate aquí
              </button>
            )}
            {viewMode === "register" && (
              <button
                onClick={() => {
                  setViewMode("login");
                  clearMessages();
                }}
                className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300 flex items-center justify-center w-full"
              >
                <ArrowLeft size={12} className="mr-1" /> ¿Ya tienes una cuenta?
                Inicia sesión
              </button>
            )}
            {viewMode === "forgot" && (
              <button
                onClick={() => {
                  setViewMode("login");
                  clearMessages();
                }}
                className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300 flex items-center justify-center w-full"
              >
                <ArrowLeft size={12} className="mr-1" /> Volver a Iniciar Sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
