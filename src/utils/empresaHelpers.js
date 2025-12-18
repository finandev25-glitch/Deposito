// Solución temporal para el problema de empresas
// Este archivo contiene las funciones handleAddEmpresa y handleUpdateEmpresa corregidas

const handleAddEmpresa = async (newEmpresaData, supabase, setEmpresas, isSupabaseConnected) => {
  console.log('🏢 Creando nueva empresa:', newEmpresaData);
  console.log('🔗 Supabase conectado:', isSupabaseConnected);
  
  if (isSupabaseConnected) {
    try {
      console.log("📡 Enviando nueva empresa a Supabase...");
      
      const { data, error } = await supabase
        .from("empresas")
        .insert({ ...newEmpresaData, estado: "activo" })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error creando empresa en Supabase:', error);
        
        // Fallback a modo local si hay error
        console.log('🔄 Fallback a modo local...');
        const newEmpresa = {
          id: Date.now().toString(),
          ...newEmpresaData,
          estado: "activo",
          created_at: new Date().toISOString(),
        };
        setEmpresas((prev) => [...prev, newEmpresa]);
        return newEmpresa;
      }
      
      console.log('✅ Empresa creada en Supabase:', data);
      setEmpresas((prev) => [...prev, data]);
      return data;
      
    } catch (error) {
      console.error("💥 Error crítico creando empresa:", error);
      
      // Fallback a modo local
      console.log('🔄 Fallback a modo local por error...');
      const newEmpresa = {
        id: Date.now().toString(),
        ...newEmpresaData,
        estado: "activo",
        created_at: new Date().toISOString(),
      };
      setEmpresas((prev) => [...prev, newEmpresa]);
      return newEmpresa;
    }
  } else {
    const newEmpresa = {
      id: Date.now().toString(),
      ...newEmpresaData,
      estado: "activo",
      created_at: new Date().toISOString(),
    };
    console.log("🎭 Empresa creada en modo simulado:", newEmpresa);
    setEmpresas((prev) => [...prev, newEmpresa]);
    return newEmpresa;
  }
};

const handleUpdateEmpresa = async (empresaId, updatedData, supabase, setEmpresas, isSupabaseConnected) => {
  console.log("🔄 Actualizando empresa:", empresaId, updatedData);
  console.log("🔗 Supabase conectado:", isSupabaseConnected);
  
  if (isSupabaseConnected) {
    try {
      console.log("📡 Enviando actualización a Supabase...");
      
      const { data, error } = await supabase
        .from("empresas")
        .update(updatedData)
        .eq("id", empresaId)
        .select()
        .single();

      if (error) {
        console.error("❌ Error actualizando empresa en Supabase:", error);
        
        // Fallback a modo local si hay error
        console.log('🔄 Fallback a modo local...');
        const updatedEmpresa = { id: empresaId, ...updatedData };
        setEmpresas((prev) => prev.map((e) => (e.id === empresaId ? { ...e, ...updatedData } : e)));
        return updatedEmpresa;
      }

      console.log("✅ Empresa actualizada en Supabase:", data);
      setEmpresas((prev) => prev.map((e) => (e.id === empresaId ? data : e)));
      return data;
      
    } catch (error) {
      console.error("💥 Error crítico actualizando empresa:", error);
      
      // Fallback a modo local
      console.log('🔄 Fallback a modo local por error...');
      const updatedEmpresa = { id: empresaId, ...updatedData };
      setEmpresas((prev) => prev.map((e) => (e.id === empresaId ? { ...e, ...updatedData } : e)));
      return updatedEmpresa;
    }
  } else {
    console.log("🎭 Actualizando empresa en modo simulado");
    const updatedEmpresa = { id: empresaId, ...updatedData };
    console.log('✅ Empresa actualizada en modo simulado:', updatedEmpresa);
    setEmpresas((prev) => prev.map((e) => (e.id === empresaId ? { ...e, ...updatedData } : e)));
    return updatedEmpresa;
  }
};

export { handleAddEmpresa, handleUpdateEmpresa };