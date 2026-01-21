import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// YCloud API Base URL para obtener mensajes
const YCLOUD_API_URL = 'https://api.ycloud.com/v2/whatsapp/messages'

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
      phoneNumber,    // Número de teléfono para filtrar
      startDate,      // Fecha de inicio (ISO string)
      endDate,        // Fecha de fin (ISO string)
      limit = 50,     // Límite de mensajes
    } = await req.json()

    console.log('📞 YCloud Get Conversation - Datos recibidos:', {
      configId,
      phoneNumber,
      startDate,
      endDate,
      limit
    })

    // Validar datos requeridos
    if (!configId) {
      throw new Error('configId es requerido')
    }
    if (!phoneNumber) {
      throw new Error('phoneNumber es requerido')
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
      alias: config.alias
    })

    // Construir query params para la API de YCloud
    // Documentación: https://docs.ycloud.com/reference/whatsapp_message-list
    const queryParams = new URLSearchParams()

    // Límite de mensajes
    queryParams.append('page.size', limit.toString())

    // Filtrar por fecha si se proporciona
    if (startDate) {
      queryParams.append('filter.createTime.gte', startDate)
    }
    if (endDate) {
      queryParams.append('filter.createTime.lte', endDate)
    }

    const apiUrl = `${YCLOUD_API_URL}?${queryParams.toString()}`

    console.log('📤 Consultando YCloud API:', {
      url: apiUrl
    })

    // Realizar petición a YCloud API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-Key': config.api_key,
      }
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
          messages: [],
          details: responseData
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Filtrar mensajes por número de teléfono (tanto enviados como recibidos)
    const allMessages = responseData.items || responseData.data || []

    // Limpiar el número de teléfono para comparar
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, '')

    const filteredMessages = allMessages.filter((msg: any) => {
      const msgTo = (msg.to || '').replace(/[\s\-\(\)\+]/g, '')
      const msgFrom = (msg.from || '').replace(/[\s\-\(\)\+]/g, '')

      return msgTo.includes(cleanPhone) ||
             msgFrom.includes(cleanPhone) ||
             cleanPhone.includes(msgTo) ||
             cleanPhone.includes(msgFrom)
    })

    // Obtener el número de origen limpio para determinar dirección
    const configFromNumber = (config.default_from_number || '').replace(/[\s\-\(\)\+]/g, '')

    // Transformar mensajes al formato esperado por el frontend
    const formattedMessages = filteredMessages.map((msg: any) => {
      const msgFrom = (msg.from || '').replace(/[\s\-\(\)\+]/g, '')
      const isOutbound = msgFrom === configFromNumber || msgFrom.includes(configFromNumber) || configFromNumber.includes(msgFrom)

      return {
        id: msg.id,
        direction: isOutbound ? 'outbound' : 'inbound',
        text: msg.text?.body || msg.template?.name || '',
        content: msg.text?.body || msg.template?.name || (msg.type !== 'text' ? `[${msg.type}]` : ''),
        type: msg.type,
        status: msg.status,
        timestamp: msg.createTime || msg.sendTime,
        createdAt: msg.createTime,
        to: msg.to,
        from: msg.from,
        // Datos adicionales
        errorCode: msg.errorCode,
        errorMessage: msg.errorMessage,
        externalId: msg.externalId,
      }
    })

    // Ordenar por fecha ascendente (más antiguos primero para chat)
    formattedMessages.sort((a: any, b: any) => {
      const dateA = new Date(a.timestamp || a.createdAt).getTime()
      const dateB = new Date(b.timestamp || b.createdAt).getTime()
      return dateA - dateB
    })

    console.log('✅ Mensajes obtenidos:', {
      total: allMessages.length,
      filtrados: filteredMessages.length,
      phoneNumber: cleanPhone
    })

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        message: `Se encontraron ${formattedMessages.length} mensajes`,
        messages: formattedMessages,
        totalCount: allMessages.length,
        filteredCount: formattedMessages.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('💥 Error en YCloud Get Conversation:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        messages: [],
        details: error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
