import React, { useContext, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Loader2, XCircle } from "lucide-react";
import { AuthContext } from "./contexts/AuthContext.jsx";
import Sidebar from "./components/Sidebar";
import KanbanView from "./components/KanbanView";
import TableView from "./components/TableView";
import SucursalesView from "./components/SucursalesView";
import BancosView from "./components/BancosView";
import GestionBancosView from "./components/GestionBancosView";
import GestionEmpresasView from "./components/GestionEmpresasView";
import UsuariosView from "./components/UsuariosView";
import ReportesView from "./components/ReportesView";
import ConfirmadosPorHoraView from "./components/ConfirmadosPorHoraView";
import DocumentosView from "./components/DocumentosView";
import ExportarVouchersView from "./components/ExportarVouchersView";
import ConfiguracionYCloud from "./components/ConfiguracionYCloud";
import EnviarMensajeYCloud from "./components/EnviarMensajeYCloud";
import CambiarContrasena from "./components/CambiarContrasena";
import RegularizarDepositos from "./components/RegularizarDepositos";
import VoucherExtensionPanel from "./components/VoucherExtensionPanel.jsx";
import FloatingDepositMetaOverlay from "./components/FloatingDepositMetaOverlay.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import PendingApproval from "./pages/PendingApproval.jsx";
import MobileHeader from "./components/MobileHeader.jsx";
import { useDepositDashboard } from "./hooks/useDepositDashboard.js";

function App({ uiMode = "default" }) {
  const isExtensionMode = uiMode === "extension";
  const { currentUser, loading, refreshUsers } = useContext(AuthContext);
  const location = useLocation();
  const {
    bancos,
    empresas,
    cuentas,
    sucursales,
    depositsWithFullData,
    appDataLoading,
    appDataError,
    realtimeStatus,
    realtimeErrors,
    realtimeActivity,
    isSupabaseConnected,
    workloadAlarmActive,
    workloadThreshold,
    pendingWorkloadCount,
    replacementRequestState,
    voucherPanelState,
    currentSelectedDate,
    refreshDeposits,
    fetchDepositsByDate,
    fetchAllDeposits,
    fetchDepositsByPeriod,
    handleSelectedDateChange,
    handleSelectDate,
    handleOpenVoucherWindow,
    handleCloseVoucherPanel,
    handleAddBanco,
    handleUpdateBanco,
    handleDeleteBanco,
    handleAddEmpresa,
    handleUpdateEmpresa,
    handleAddCuenta,
    handleBatchAddCuentas,
    handleUpdateCuenta,
    handleDeleteCuenta,
    handleAddSucursal,
    handleUpdateSucursal,
    handleAddPersonalToSucursal,
    handleRemovePersonalFromSucursal,
    handleUpdatePersonal,
    handleUpdateDeposit,
    handleTakeDepositForValidation,
    fetchBancosData,
    fetchEmpresasData,
    fetchCuentasData,
    requestReplacementHelp,
  } = useDepositDashboard();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isExtensionMode);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const detailPresentationMode = isExtensionMode ? "compact" : "default";
  const attendanceSummary = useMemo(() => {
    if (!currentSelectedDate) return [];

    const counts = new Map();

    depositsWithFullData.forEach((deposit) => {
      if (!deposit || deposit.fecha_solo_date !== currentSelectedDate) {
        return;
      }

      if (deposit.estado === "pendiente") {
        return;
      }

      const assignedUser = String(
        deposit.validado_por_usuario?.nombre ||
          deposit.validado_por_nombre ||
          deposit.validado_por ||
          "Sin asignar",
      ).trim();

      if (!assignedUser) {
        return;
      }

      counts.set(assignedUser, (counts.get(assignedUser) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));
  }, [currentSelectedDate, depositsWithFullData]);

  useEffect(() => {
    if (!currentUser) return;

    const shouldRefreshOnEnter = [
      "/usuarios",
      "/bancos",
      "/gestion-bancos",
      "/gestion-empresas",
    ].includes(location.pathname);

    if (!shouldRefreshOnEnter) return;

    const refreshModuleData = async () => {
      try {
        if (location.pathname === "/usuarios") {
          await refreshUsers?.();
          return;
        }

        if (location.pathname === "/bancos") {
          await Promise.all([
            fetchBancosData?.(),
            fetchEmpresasData?.(),
            fetchCuentasData?.(),
          ]);
          return;
        }

        if (location.pathname === "/gestion-bancos") {
          await fetchBancosData?.();
          return;
        }

        if (location.pathname === "/gestion-empresas") {
          await fetchEmpresasData?.();
          return;
        }
      } catch (error) {
        console.warn("No se pudo refrescar el módulo al ingresar:", error);
      }
    };

    refreshModuleData();
  }, [currentUser, fetchBancosData, fetchCuentasData, fetchEmpresasData, location.pathname, refreshUsers]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="ml-4 text-lg text-gray-700 dark:text-gray-300">
            Inicializando aplicaciÃ³n...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage />;
  }

  if (currentUser.estado === "inactivo") {
    return <PendingApproval />;
  }

  if (appDataLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-4 text-lg text-gray-700 dark:text-gray-300">
          Cargando datos...
        </p>
      </div>
    );
  }

  if (appDataError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Error CrÃ­tico
          </h3>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            {appDataError}
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Intenta recargar la pÃ¡gina. Si el problema persiste, contacta a soporte.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-screen overflow-hidden ${
        isExtensionMode
          ? "bg-slate-100 p-0 dark:bg-gray-950"
          : "bg-gray-50 dark:bg-gray-950"
      }`}
    >
        <Sidebar
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          compactMode={isExtensionMode}
          selectedDate={currentSelectedDate}
          attendanceSummary={attendanceSummary}
          workloadAlarmActive={workloadAlarmActive}
          pendingWorkloadCount={pendingWorkloadCount}
          workloadThreshold={workloadThreshold}
          onRequestReplacementHelp={requestReplacementHelp}
          replacementRequestState={replacementRequestState}
        />
      <div
        className={`flex min-w-0 flex-1 flex-col ${
          isExtensionMode
            ? "overflow-hidden bg-white dark:bg-gray-900"
            : ""
        }`}
      >
        <MobileHeader
          onMenuClick={() => setIsMobileMenuOpen(true)}
          connectionStatus={{
            supabaseConnected: isSupabaseConnected,
            realtimeStatus,
            realtimeErrors,
          }}
          compactMode={isExtensionMode}
          realtimeActivity={realtimeActivity}
          selectedDate={currentSelectedDate}
          attendanceSummary={attendanceSummary}
          workloadAlarmActive={workloadAlarmActive}
          pendingWorkloadCount={pendingWorkloadCount}
          workloadThreshold={workloadThreshold}
          onRequestReplacementHelp={requestReplacementHelp}
          replacementRequestState={replacementRequestState}
        />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/kanban" replace />} />
            <Route
              path="/kanban"
              element={
                <KanbanView
                  deposits={depositsWithFullData}
                  onUpdateDeposit={handleUpdateDeposit}
                  onTakeDeposit={handleTakeDepositForValidation}
                  onFetchDepositsByDate={fetchDepositsByDate}
                  onFetchAllDeposits={fetchAllDeposits}
                  onSelectedDateChange={handleSelectedDateChange}
                  onSelectDate={handleSelectDate}
                  empresas={empresas}
                  bancos={bancos}
                  cuentas={cuentas}
                  onOpenVoucherWindow={handleOpenVoucherWindow}
                  connectionStatus={{
                    supabaseConnected: isSupabaseConnected,
                    realtimeStatus,
                    realtimeErrors,
                  }}
                  showConnectionStatus={!isExtensionMode}
                  realtimeActivity={realtimeActivity}
                  workloadAlarmActive={workloadAlarmActive}
                  pendingWorkloadCount={pendingWorkloadCount}
                  workloadThreshold={workloadThreshold}
                  onRequestReplacementHelp={requestReplacementHelp}
                  replacementRequestState={replacementRequestState}
                  detailPresentationMode={detailPresentationMode}
                />
              }
            />
            <Route
              path="/table"
              element={
                <TableView
                  deposits={depositsWithFullData}
                  onUpdateDeposit={handleUpdateDeposit}
                  onFetchDepositsByDate={fetchDepositsByDate}
                  onFetchDepositsByPeriod={fetchDepositsByPeriod}
                  onSelectedDateChange={handleSelectedDateChange}
                  onSelectDate={handleSelectDate}
                  empresas={empresas}
                  bancos={bancos}
                  cuentas={cuentas}
                  onOpenVoucherWindow={handleOpenVoucherWindow}
                  detailPresentationMode={detailPresentationMode}
                />
              }
            />
            <Route
              path="/sucursales"
              element={
                <SucursalesView
                  sucursales={sucursales}
                  deposits={depositsWithFullData}
                  onAddSucursal={handleAddSucursal}
                  onUpdateSucursal={handleUpdateSucursal}
                  onDeleteSucursal={(id) => handleUpdateSucursal(id, { estado: "inactiva" })}
                  onAddPersonal={handleAddPersonalToSucursal}
                  onRemovePersonal={handleRemovePersonalFromSucursal}
                  onUpdatePersonal={handleUpdatePersonal}
                />
              }
            />
            <Route
              path="/bancos"
              element={
                <BancosView
                  bancos={bancos}
                  empresas={empresas}
                  onAddEmpresa={handleAddEmpresa}
                  cuentas={cuentas}
                  onAddCuenta={handleAddCuenta}
                  onUpdateCuenta={handleUpdateCuenta}
                  onDeleteCuenta={handleDeleteCuenta}
                  onBatchAddCuentas={handleBatchAddCuentas}
                />
              }
            />
            <Route
              path="/gestion-bancos"
              element={
                <GestionBancosView
                  bancos={bancos}
                  onAdd={handleAddBanco}
                  onUpdate={handleUpdateBanco}
                  onDelete={handleDeleteBanco}
                />
              }
            />
            <Route
              path="/gestion-empresas"
              element={
                <GestionEmpresasView
                  empresas={empresas}
                  onAdd={handleAddEmpresa}
                  onUpdate={handleUpdateEmpresa}
                />
              }
            />
            <Route
              path="/usuarios"
              element={
                currentUser?.user_rol === "admin" ? (
                  <UsuariosView />
                ) : (
                  <Navigate to="/kanban" replace />
                )
              }
            />
            <Route
              path="/configuracion-ycloud"
              element={
                currentUser?.user_rol === "admin" ? (
                  <ConfiguracionYCloud />
                ) : (
                  <Navigate to="/kanban" replace />
                )
              }
            />
            <Route
              path="/enviar-mensaje-ycloud"
              element={
                currentUser?.user_rol === "admin" ? (
                  <EnviarMensajeYCloud />
                ) : (
                  <Navigate to="/kanban" replace />
                )
              }
            />
            <Route path="/reportes" element={<ReportesView />} />
            <Route path="/confirmados" element={<ConfirmadosPorHoraView />} />
            <Route path="/apoyo" element={<Navigate to="/confirmados" replace />} />
            <Route
              path="/documentos"
              element={<DocumentosView />}
            />
            <Route
              path="/exportar-vouchers"
              element={<ExportarVouchersView />}
            />
            <Route path="/cambiar-contrasena" element={<CambiarContrasena />} />
            <Route
              path="/regularizar-depositos"
              element={
                <RegularizarDepositos
                  onDepositUpdated={() =>
                    currentSelectedDate ? refreshDeposits() : fetchAllDeposits()
                  }
                />
              }
            />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
          </Routes>
        </main>
      </div>

      {isExtensionMode && (
        <>
          <VoucherExtensionPanel
            isOpen={voucherPanelState.isOpen}
            voucherUrl={voucherPanelState.voucherUrl}
            depositData={voucherPanelState.depositData}
            onClose={handleCloseVoucherPanel}
          />

          <FloatingDepositMetaOverlay
            isOpen={voucherPanelState.isOpen}
            depositData={voucherPanelState.depositData}
            onClose={handleCloseVoucherPanel}
          />
        </>
      )}
    </div>
  );
}

export default App;
