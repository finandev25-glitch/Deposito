// ============================================
// CÓDIGO ACTUAL: Reconexión Inteligente
// ============================================
// Esta es la versión NUEVA que decide inteligentemente
// si recargar solo datos o la página completa
// ============================================

// 👁️ Reconexión inteligente cuando el usuario regresa a la pestaña
useEffect(() => {
    if (!currentUser || !isSupabaseConnected) return;

    let wasHidden = false;
    let lastHiddenTime = 0;
    const RECONNECT_THRESHOLD = 5 * 60 * 1000; // 5 minutos
    const CONNECTION_TEST_TIMEOUT = 3000; // 3 segundos para probar conexión

    const testConnection = async () => {
        try {
            // Crear una promesa con timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection test timeout')), CONNECTION_TEST_TIMEOUT)
            );

            const queryPromise = supabase
                .from("depositos")
                .select("id")
                .limit(1);

            // Ejecutar la query con timeout
            const { error } = await Promise.race([queryPromise, timeoutPromise]);

            return !error; // true si la conexión está OK
        } catch (err) {
            console.error("⚠️ Error probando conexión:", err.message);
            return false; // false si hay cualquier error
        }
    };

    const handleVisibilityChange = async () => {
        console.log("🔍 VISIBILIDAD CAMBIÓ:", document.visibilityState);

        if (document.visibilityState === "hidden") {
            wasHidden = true;
            lastHiddenTime = Date.now();
            console.log("👋 Página se ocultó");
        } else if (document.visibilityState === "visible" && wasHidden) {
            const timeHidden = Date.now() - lastHiddenTime;
            console.log(`👀 Página visible después de ${Math.round(timeHidden / 1000)}s`);

            // Si estuvo oculta más de 5 minutos, verificar conexión
            if (timeHidden > RECONNECT_THRESHOLD) {
                console.log("⚠️ Pestaña inactiva >5min - Verificando conexión...");

                const isConnected = await testConnection();

                if (isConnected) {
                    console.log("✅ Conexión OK - Recargando solo datos...");
                    refreshDeposits();
                } else {
                    console.error("❌ Conexión perdida o timeout - Recargando página...");
                    window.location.reload();
                }
            } else {
                console.log("✅ Pestaña inactiva <5min - Recargando datos...");
                // Si estuvo oculta menos de 5 minutos, solo recargar datos
                // (asumimos que la conexión sigue activa)
                refreshDeposits();
            }

            wasHidden = false;
        }
    };

    // Listener principal de visibilidad
    document.addEventListener("visibilitychange", handleVisibilityChange);

    console.log("✅ Listener de reconexión inteligente instalado");

    return () => {
        console.log("🧹 Limpiando listener de reconexión");
        document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
}, [currentUser, isSupabaseConnected]);

// ============================================
// FIN DEL CÓDIGO ACTUAL
// ============================================
