# Guía: Cómo responder a un mensaje específico de Chatwoot

## Descripción

Esta guía explica cómo usar la funcionalidad de respuesta a mensajes específicos en Chatwoot desde tu aplicación.

---

## 1. Estructura de la respuesta en Chatwoot

Cuando respondes a un mensaje específico en Chatwoot, se usa el parámetro `content_attributes.in_reply_to` que contiene el ID del mensaje original.

### Ejemplo de payload enviado a Chatwoot API:

```json
{
  "content": "Esta es mi respuesta",
  "message_type": "outgoing",
  "private": false,
  "content_type": "text",
  "content_attributes": {
    "in_reply_to": "12345"  // ID del mensaje al que se responde
  }
}
```

---

## 2. Uso del servicio `chatwootService.replyToMessage()`

### Importar el servicio

```javascript
import chatwootService from "../services/chatwootService.js";
```

### Método: `replyToMessage()`

**Parámetros:**

```javascript
{
  configId: string,           // ID de la configuración de Chatwoot
  conversationId: string,     // ID de la conversación
  content: string,            // Contenido del mensaje de respuesta
  inReplyTo: string|number,   // ID del mensaje al que se está respondiendo
  private: boolean            // (Opcional) Si el mensaje es privado (default: false)
}
```

**Ejemplo de uso:**

```javascript
const result = await chatwootService.replyToMessage({
  configId: "1",
  conversationId: "45678",
  content: "Gracias por tu mensaje. El depósito ha sido confirmado.",
  inReplyTo: "12345", // ID del mensaje original
  private: false
});

if (result.success) {
  console.log("Respuesta enviada:", result.data.id);
} else {
  console.error("Error:", result.message);
}
```

---

## 3. Implementación en el modal de depósitos

### Flujo automático implementado

En `DepositDetailModal.jsx`, la función `handleConfirmDepositChatwoot` ahora detecta automáticamente si el depósito ya tiene un mensaje previo de Chatwoot guardado:

#### Caso 1: Primera confirmación (sin mensaje previo)
```javascript
// deposit.chatwoot_message_id === null
// Se envía un mensaje nuevo usando sendMessage()
```

#### Caso 2: Re-confirmación o actualización (con mensaje previo)
```javascript
// deposit.chatwoot_message_id === "12345"
// Se responde al mensaje original usando replyToMessage()
```

### Código implementado:

```javascript
const result = deposit.chatwoot_message_id
  ? await chatwootService.replyToMessage({
      configId: chatwootConfigId,
      conversationId: chatwootConversationId,
      content: mensajeChatwoot,
      inReplyTo: deposit.chatwoot_message_id,
    })
  : await chatwootService.sendMessage({
      configId: chatwootConfigId,
      conversationId: chatwootConversationId,
      content: mensajeChatwoot,
      messageType: "outgoing",
    });
```

---

## 4. Ejemplos de uso práctico

### Ejemplo 1: Responder manualmente a un mensaje

```javascript
// Supongamos que tienes estos datos guardados en la BD
const deposito = {
  id: "abc-123",
  chatwoot_conversation_id: "45678",
  chatwoot_message_id: "12345",
  chatwoot_config_id: "1"
};

// Enviar una actualización como respuesta al mensaje original
const respuesta = await chatwootService.replyToMessage({
  configId: deposito.chatwoot_config_id,
  conversationId: deposito.chatwoot_conversation_id,
  content: "Actualización: El depósito fue procesado correctamente.",
  inReplyTo: deposito.chatwoot_message_id
});
```

### Ejemplo 2: Responder con un mensaje privado (nota interna)

```javascript
const respuesta = await chatwootService.replyToMessage({
  configId: "1",
  conversationId: "45678",
  content: "Nota interna: Este depósito fue verificado manualmente.",
  inReplyTo: "12345",
  private: true  // Mensaje privado, solo visible para agentes
});
```

### Ejemplo 3: Enviar múltiples respuestas en hilos

```javascript
// Primer mensaje (confirmación original)
const msg1 = await chatwootService.sendMessage({
  configId: "1",
  conversationId: "45678",
  content: "Depósito confirmado",
  messageType: "outgoing"
});

// Segundo mensaje (responde al primero)
const msg2 = await chatwootService.replyToMessage({
  configId: "1",
  conversationId: "45678",
  content: "Detalles adicionales del depósito",
  inReplyTo: msg1.data.id
});

// Tercer mensaje (responde al segundo)
const msg3 = await chatwootService.replyToMessage({
  configId: "1",
  conversationId: "45678",
  content: "Comprobante adjunto",
  inReplyTo: msg2.data.id
});
```

---

## 5. Estructura de la base de datos

Los mensajes de Chatwoot se guardan en la tabla `depositos` con estas columnas:

```sql
CREATE TABLE depositos (
  id uuid PRIMARY KEY,
  -- ... otros campos ...
  chatwoot_conversation_id text,    -- ID de la conversación
  chatwoot_message_id text,         -- ID del mensaje enviado
  chatwoot_config_id integer        -- ID de la configuración usada
);
```

---

## 6. Visualización en Chatwoot

Cuando respondes a un mensaje específico, Chatwoot muestra:

```
┌─────────────────────────────────┐
│ Usuario Cliente                 │
│ ¿Cuándo se confirmará mi dep...│
└─────────────────────────────────┘
        ↓ (respuesta)
┌─────────────────────────────────┐
│ Tu Sistema                      │
│ ↩️ Respondiendo a: "¿Cuándo..." │
│ El depósito ha sido confirmado  │
│ exitosamente.                   │
└─────────────────────────────────┘
```

---

## 7. Manejo de errores

```javascript
try {
  const result = await chatwootService.replyToMessage({
    configId: "1",
    conversationId: "45678",
    content: "Mi respuesta",
    inReplyTo: "12345"
  });

  if (!result.success) {
    console.error("Error enviando respuesta:", result.message);

    // Posibles errores:
    // - Mensaje original no encontrado
    // - Conversación cerrada
    // - Configuración inválida
    // - Permisos insuficientes
  }
} catch (error) {
  console.error("Error crítico:", error);
}
```

---

## 8. Casos de uso recomendados

### ✅ Usar `replyToMessage()` cuando:

1. Quieres crear un hilo de conversación organizado
2. Necesitas hacer referencia a un mensaje anterior
3. Estás actualizando información de un depósito previamente notificado
4. Quieres que el usuario vea el contexto de tu respuesta

### ✅ Usar `sendMessage()` cuando:

1. Es la primera notificación de un depósito
2. Quieres enviar información independiente
3. No necesitas hacer referencia a mensajes anteriores

---

## 9. API de Chatwoot (referencia)

### Endpoint usado:

```
POST {chatwoot_url}/api/v1/accounts/{account_id}/conversations/{conversation_id}/messages
```

### Headers:

```http
Content-Type: application/json
api_access_token: tu_token_de_api
```

### Documentación oficial:

- [Chatwoot API - Messages](https://www.chatwoot.com/docs/product/channels/api/send-messages)
- [Chatwoot API - Content Attributes](https://www.chatwoot.com/docs/product/channels/api/message-types)

---

## 10. Testing

### Probar la funcionalidad:

1. Abre un depósito en el modal
2. Llena los campos de Chatwoot:
   - Selecciona una configuración
   - Ingresa el ID de conversación
3. Click en "Confirmar (Chatwoot)"
4. Verifica en Chatwoot que el mensaje se envió
5. Vuelve a abrir el mismo depósito
6. Click nuevamente en "Confirmar (Chatwoot)"
7. Esta vez, el mensaje será una **respuesta** al mensaje original

---

## Resumen

- ✅ `replyToMessage()` crea hilos de conversación organizados
- ✅ Detecta automáticamente si responder o enviar nuevo mensaje
- ✅ Guarda `chatwoot_message_id` para futuras respuestas
- ✅ Soporta mensajes privados (notas internas)
- ✅ Compatible con toda la API de Chatwoot

