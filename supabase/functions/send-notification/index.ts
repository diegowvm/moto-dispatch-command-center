import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  app_id: string;
  included_segments?: string[];
  filters?: Array<{
    field: string;
    key: string;
    relation: string;
    value: string;
  }>;
  headings: {
    en: string;
    pt: string;
  };
  contents: {
    en: string;
    pt: string;
  };
  data?: Record<string, any>;
  url?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, pedidoId, data } = await req.json();
    
    // Get OneSignal REST API Key from environment (configured in Supabase secrets)
    const oneSignalRestApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
    const oneSignalAppId = '2e795a82-c5c0-4fbc-94a5-72f363a36423';
    
    if (!oneSignalRestApiKey) {
      throw new Error('OneSignal REST API Key not configured');
    }

    let notificationPayload: NotificationPayload;

    switch (type) {
      case 'new_order':
        notificationPayload = {
          app_id: oneSignalAppId,
          included_segments: ['Admins', 'All'],
          headings: {
            en: 'New Order Received',
            pt: 'Novo Pedido Recebido'
          },
          contents: {
            en: `Order ${data.numeroPedido} from ${data.empresa}`,
            pt: `Pedido ${data.numeroPedido} da empresa ${data.empresa}`
          },
          data: {
            type: 'new_order',
            pedido_id: pedidoId,
            numero_pedido: data.numeroPedido
          },
          url: `/dashboard/pedidos/${pedidoId}`
        };
        break;

      case 'order_assigned':
        notificationPayload = {
          app_id: oneSignalAppId,
          filters: [
            {
              field: 'tag',
              key: 'user_type',
              relation: '=',
              value: 'entregador'
            },
            {
              field: 'tag', 
              key: 'user_id',
              relation: '=',
              value: data.entregadorId
            }
          ],
          headings: {
            en: 'New Delivery Assigned',
            pt: 'Nova Entrega Atribuída'
          },
          contents: {
            en: `You have been assigned order ${data.numeroPedido}`,
            pt: `Você recebeu o pedido ${data.numeroPedido}`
          },
          data: {
            type: 'order_assigned',
            pedido_id: pedidoId,
            numero_pedido: data.numeroPedido
          },
          url: `/dashboard/pedidos/${pedidoId}`
        };
        break;

      case 'status_update':
        const statusMessages = {
          'enviado': { en: 'has been sent for pickup', pt: 'foi enviado para coleta' },
          'a_caminho': { en: 'is on the way', pt: 'está a caminho' },
          'entregue': { en: 'has been delivered', pt: 'foi entregue' },
          'cancelado': { en: 'has been cancelled', pt: 'foi cancelado' }
        };

        const statusMessage = statusMessages[data.status as keyof typeof statusMessages] || 
          { en: `status updated to ${data.status}`, pt: `status atualizado para ${data.status}` };

        notificationPayload = {
          app_id: oneSignalAppId,
          included_segments: ['Admins'],
          headings: {
            en: 'Order Status Updated',
            pt: 'Status do Pedido Atualizado'
          },
          contents: {
            en: `Order ${data.numeroPedido} ${statusMessage.en}`,
            pt: `Pedido ${data.numeroPedido} ${statusMessage.pt}`
          },
          data: {
            type: 'status_update',
            pedido_id: pedidoId,
            numero_pedido: data.numeroPedido,
            status: data.status
          },
          url: `/dashboard/pedidos/${pedidoId}`
        };
        break;

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    // Send notification to OneSignal
    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${oneSignalRestApiKey}`
      },
      body: JSON.stringify(notificationPayload)
    });

    if (!oneSignalResponse.ok) {
      const errorData = await oneSignalResponse.text();
      console.error('OneSignal API error:', errorData);
      throw new Error(`OneSignal API error: ${oneSignalResponse.status}`);
    }

    const oneSignalResult = await oneSignalResponse.json();
    
    console.log('Notification sent successfully:', oneSignalResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: oneSignalResult.id,
        recipients: oneSignalResult.recipients 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error sending notification:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send notification' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});