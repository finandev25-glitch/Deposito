import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
      conversationId,
      content,
      messageType = 'outgoing',
      private: isPrivate = false,
      contentType = 'text',
      contentAttributes = {},
      campaignId,
      templateParams
    } = await req.json()

    console.log('🚀 ChatWoot Edge Function - Datos recibidos:', {
      configId,
      conversationId,
      content: content ? (content.substring(0, 50) + '...') : 'N/A',
      messageType
    })

    // Validar datos requeridos
    if (!configId) {
      throw new Error('configId es requerido')
    }
    if (!conversationId) {
      throw new Error('conversationId es requerido')
    }
    if (!content) {
      throw new Error('content es requerido')
    }

    // Obtener configuración ChatWoot de la base de datos
    const { data: config, error: configError } = await supabase
      .from('chatwoot_config')
      .select('*')
      .eq('id', configId)
      .eq('activo', true)
      .single()

    if (configError || !config) {
      console.error('❌ Error obteniendo configuración:', configError)
      throw new Error('Configuración ChatWoot no encontrada o inactiva')
    }

    console.log('✅ Configuración ChatWoot encontrada:', {
      alias: config.alias,
      chatwoot_url: config.chatwoot_url,
      account_id: config.account_id
    })

    // Limpiar URL de ChatWoot
    const cleanUrl = (url: string) => {
      if (!url) return url
      if (url.includes('/app/accounts')) {
        return url.split('/app/accounts')[0]
      }
      return url
    }

    // Construir URL de la API
    const baseUrl = cleanUrl(config.chatwoot_url)
    const apiUrl = `${baseUrl}/api/v1/accounts/${config.account_id}/conversations/${conversationId}/messages`

    // Preparar payload para ChatWoot
    const payload: any = {
      content,
      message_type: messageType,
      private: isPrivate,
      content_type: contentType,
      content_attributes: contentAttributes
    }

    // Agregar campaign_id si está presente
    if (campaignId) {
      payload.campaign_id = parseInt(campaignId.toString())
    }

    // Agregar template_params si se está usando template
    if (templateParams && templateParams.name) {
      payload.template_params = templateParams
    }

    console.log('📤 Enviando a ChatWoot API:', {
      url: apiUrl,
      payload: {
        ...payload,
        content: payload.content ? (payload.content.substring(0, 50) + '...') : 'N/A'
      }
    })

    // Realizar petición a ChatWoot API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api_access_token': config.api_token,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(payload)
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('❌ Error de ChatWoot API:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      })

      return new Response(
        JSON.stringify({
          success: false,
          error: `ChatWoot API Error ${response.status}: ${responseData.message || response.statusText}`,
          details: responseData
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Mensaje enviado exitosamente a ChatWoot:', {
      message_id: responseData.id,
      status: responseData.status,
      conversation_id: responseData.conversation_id
    })

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mensaje enviado exitosamente a ChatWoot',
        data: responseData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('💥 Error en ChatWoot Edge Function:', error)

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