// ============================================
// BACKUP: Código de Recarga Automática
// Fecha: 2025-12-19
// ============================================
// Este código se encarga de recargar la página cuando el usuario
// regresa a la pestaña después de haber estado en otra.
// Se usa para prevenir desconexiones de Supabase.
// ============================================

// 👁️ Detectar cuando el usuario regresa a la pestaña y recargar automáticamente
// Solución al problema conocido de Supabase con pestañas inactivas
useEffect(() => {
    if (!currentUser || !isSupabaseConnected) return;

    const hasReloadedRef = { current: false };
    let wasHidden = false;

    const handleVisibilityChange = () => {
        console.log("🔍 VISIBILIDAD CAMBIÓ:", document.visibilityState);

        if (document.visibilityState === "hidden") {
            wasHidden = true;
            hasReloadedRef.current = false;
            console.log("👋 Página se ocultó");
        } else if (document.visibilityState === "visible" && wasHidden && !hasReloadedRef.current) {
            console.log("👀 Página visible nuevamente - RECARGANDO!");
            hasReloadedRef.current = true;

            setTimeout(() => {
                console.log("🔄 Ejecutando window.location.reload()...");
                window.location.reload();
            }, 300);
        }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    console.log("✅ Listener de visibilidad instalado");

    return () => {
        console.log("🧹 Limpiando listener de visibilidad");
        document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
}, [currentUser, isSupabaseConnected]);
