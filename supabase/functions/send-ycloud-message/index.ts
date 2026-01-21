import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// YCloud API Base URL
const YCLOUD_API_URL = 'https://api.ycloud.com/v2/whatsapp/messages/sendDirectly'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Obtener datos del request
    const {
      configId,
      to,                    // Número de destino (requerido)
      from,                  // Número de origen (opcional, usa default de config)
      type = 'text',         // Tipo de mensaje: text, template, image, document, etc.
      text,                  // Contenido del mensaje de texto
      template,              // Datos del template (si type = 'template')
      image,                 // Datos de imagen (si type = 'image')
      document,              // Datos de documento (si type = 'document')
      video,                 // Datos de video (si type = 'video')
      audio,                 // Datos de audio (si type = 'audio')
      location,              // Datos de ubicación (si type = 'location')
      interactive,           // Datos interactivos (botones, listas)
      context,               // Contexto para respuestas
      filterUnsubscribed,    // Filtrar usuarios desuscritos
      externalId,            // ID externo para tracking
    } = await req.json()

    console.log('🚀 YCloud Edge Function - Datos recibidos:', {
      configId,
      to,
      type,
      textPreview: text?.body ? (text.body.substring(0, 50) + '...') : 'N/A'
    })

    // Validar datos requeridos
    if (!configId) {
      throw new Error('configId es requerido')
    }
    if (!to) {
      throw new Error('to (número de destino) es requerido')
    }

    // Obtener configuración YCloud de la base de datos
    const { data: config, error: configError } = await supabase
      .from('ycloud_config')
      .select('*')
      .eq('id', configId)
      .eq('activo', true)
      .single()

    if (configError || !config) {
      console.error('❌ Error obteniendo configuración:', configError)
      throw new Error('Configuración YCloud no encontrada o inactiva')
    }

    console.log('✅ Configuración YCloud encontrada:', {
      alias: config.alias,
      defaultFrom: config.default_from_number
    })

    // Construir payload para YCloud API
    // Documentación: https://docs.ycloud.com/reference/whatsapp_message-send-directly
    const payload: Record<string, unknown> = {
      to: to,
      from: from || config.default_from_number,
      type: type,
    }

    // Agregar contenido según el tipo de mensaje
    switch (type) {
      case 'text':
        if (!text || !text.body) {
          throw new Error('text.body es requerido para mensajes de texto')
        }
        payload.text = {
          body: text.body,
          previewUrl: text.previewUrl || false
        }
        break

      case 'template':
        if (!template || !template.name) {
          throw new Error('template.name es requerido para mensajes de template')
        }
        payload.template = {
          name: template.name,
          language: {
            code: template.language || 'es'
          },
          components: template.components || []
        }
        break

      case 'image':
        if (!image) {
          throw new Error('image es requerido para mensajes de imagen')
        }
        payload.image = {
          link: image.link,
          caption: image.caption || undefined
        }
        break

      case 'document':
        if (!document) {
          throw new Error('document es requerido para mensajes de documento')
        }
        payload.document = {
          link: document.link,
          filename: document.filename || undefined,
          caption: document.caption || undefined
        }
        break

      case 'video':
        if (!video) {
          throw new Error('video es requerido para mensajes de video')
        }
        payload.video = {
          link: video.link,
          caption: video.caption || undefined
        }
        break

      case 'audio':
        if (!audio) {
          throw new Error('audio es requerido para mensajes de audio')
        }
        payload.audio = {
          link: audio.link
        }
        break

      case 'location':
        if (!location) {
          throw new Error('location es requerido para mensajes de ubicación')
        }
        payload.location = {
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name || undefined,
          address: location.address || undefined
        }
        break

      case 'interactive':
        if (!interactive) {
          throw new Error('interactive es requerido para mensajes interactivos')
        }
        payload.interactive = interactive
        break

      default:
        throw new Error(`Tipo de mensaje no soportado: ${type}`)
    }

    // Agregar campos opcionales
    if (context) {
      payload.context = context
    }
    if (filterUnsubscribed !== undefined) {
      payload.filterUnsubscribed = filterUnsubscribed
    }
    if (externalId) {
      payload.externalId = externalId
    }

    console.log('📤 Enviando a YCloud API:', {
      url: YCLOUD_API_URL,
      payload: {
        ...payload,
        text: payload.text ? { body: (payload.text as { body: string }).body.substring(0, 50) + '...' } : undefined
      }
    })

    // Realizar petición a YCloud API
    const response = await fetch(YCLOUD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': config.api_key,
      },
      body: JSON.stringify(payload)
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('❌ Error de YCloud API:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      })

      return new Response(
        JSON.stringify({
          success: false,
          error: `YCloud API Error ${response.status}: ${responseData.error?.message || response.statusText}`,
          details: responseData
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Mensaje enviado exitosamente a YCloud:', {
      message_id: responseData.id,
      status: responseData.status,
      to: responseData.to
    })

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mensaje enviado exitosamente via YCloud',
        data: responseData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('💥 Error en YCloud Edge Function:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
