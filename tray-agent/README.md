# Depositos Tray Agent

Agente de bandeja para Windows con UI en Avalonia.

## Que hace

- Se queda corriendo en segundo plano.
- Se conecta al backend del sistema.
- Escucha `support-request` por SSE.
- Muestra una ventana roja que parpadea cuando llega una solicitud de apoyo.
- Permite reconocer la solicitud y marcarla como atendida en Supabase.

## Requisitos

- .NET 8 SDK
- Windows 10/11

## Configuracion

La primera vez puedes abrir la ventana principal desde el icono de bandeja y definir:

- `BackendBaseUrl`
- `DashboardUrl`
- `AgentName`
- `AgentGroup`
- `MachineAlias`

Valores por defecto:

- Backend: `http://192.168.85.50:3000`
- Dashboard: `http://192.168.85.50:3000/kanban`

## Compilacion

Desde la carpeta `tray-agent`:

```powershell
dotnet restore .\DepositosTrayAgent.sln
dotnet build .\DepositosTrayAgent.sln -c Release
```

## Publicacion sugerida

```powershell
dotnet publish .\src\DepositosTrayAgent\DepositosTrayAgent.csproj `
  -c Release `
  -r win-x64 `
  --self-contained true `
  /p:PublishSingleFile=true
```

## Flujo

1. La web inserta una fila en `support_requests`.
2. El backend la escucha en Supabase.
3. El backend la reemite por `/api/events/support-requests`.
4. El agente la recibe y muestra la alarma.
5. Al reconocerla, el agente actualiza la fila a `atendido`.
