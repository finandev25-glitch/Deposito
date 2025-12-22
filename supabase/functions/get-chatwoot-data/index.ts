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
      endpoint, // El endpoint de Chatwoot (ej: /api/v1/accounts/1/conversations/123/messages)
      method = 'GET',
      body = null
    } = await req.json()

    console.log('🚀 ChatWoot GET Edge Function - Datos recibidos:', {
      configId,
      endpoint,
      method
    })

    // Validar datos requeridos
    if (!configId) {
      throw new Error('configId es requerido')
    }
    if (!endpoint) {
      throw new Error('endpoint es requerido')
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

    // Construir URL completa
    const baseUrl = cleanUrl(config.chatwoot_url)
    const fullUrl = `${baseUrl}${endpoint}`

    console.log('📤 Petición a ChatWoot API:', {
      url: fullUrl,
      method
    })

    // Realizar petición a ChatWoot API
    const fetchOptions: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api_access_token': config.api_token,
        'X-Requested-With': 'XMLHttpRequest',
      }
    }

    // Agregar body si es POST/PUT/PATCH
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOptions.body = JSON.stringify(body)
    }

    const response = await fetch(fullUrl, fetchOptions)
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

    console.log('✅ Datos obtenidos exitosamente de ChatWoot')

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        data: responseData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('💥 Error en ChatWoot GET Edge Function:', error)

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
