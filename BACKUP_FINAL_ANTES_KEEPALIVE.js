// ============================================
// BACKUP FINAL: Código Actual (Recarga Simple)
// Fecha: 2025-12-19 18:21
// ============================================
// Este código SIEMPRE recarga la página cuando regresas
// Es simple, confiable y respeta los filtros de fecha
// ============================================

// 👁️ Detectar cuando el usuario regresa a la pestaña y recargar automáticamente
useEffect(() => {
    if (!currentUser || !isSupabaseConnected) return;

    // Usar una ref para evitar recargas múltiples
    const hasReloadedRef = { current: false };
    let wasHidden = false;

    const handleVisibilityChange = () => {
        console.log("🔍 VISIBILIDAD CAMBIÓ:", document.visibilityState);

        if (document.visibilityState === "hidden") {
            wasHidden = true;
            hasReloadedRef.current = false; // Resetear la bandera cuando se oculta
            console.log("👋 Página se ocultó");
        } else if (document.visibilityState === "visible" && wasHidden && !hasReloadedRef.current) {
            console.log("👀 Página visible nuevamente - RECARGANDO!");
            hasReloadedRef.current = true; // Marcar que ya recargamos

            // Recargar después de un breve delay para asegurar que el DOM esté listo
            setTimeout(() => {
                console.log("🔄 Ejecutando window.location.reload()...");
                window.location.reload();
            }, 300);
        }
    };

    // Listener principal de visibilidad
    document.addEventListener("visibilitychange", handleVisibilityChange);

    console.log("✅ Listener de visibilidad instalado");

    return () => {
        console.log("🧹 Limpiando listener de visibilidad");
        document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
}, [currentUser, isSupabaseConnected]);

// ============================================
// FIN DEL BACKUP
// ============================================
