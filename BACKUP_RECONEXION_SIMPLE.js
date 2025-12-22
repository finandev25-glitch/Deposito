// ============================================
// BACKUP: Código de Reconexión - Versión Simple
// ============================================
// Este es el código ANTERIOR que SIEMPRE recarga la página
// Para restaurar, copia este código y reemplaza el useEffect
// de reconexión en App.jsx (líneas 469-544)
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
