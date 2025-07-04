import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NotificationPermission {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (title: string, options?: NotificationOptions) => void;
}

export const useNotifications = (): NotificationPermission => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      toast({
        variant: 'destructive',
        title: 'Notificações não suportadas',
        description: 'Seu navegador não suporta notificações'
      });
      return 'denied';
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      toast({
        title: 'Notificações ativadas',
        description: 'Você receberá notificações sobre atualizações importantes'
      });
    }
    
    return result;
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    } else {
      // Fallback para toast se não tiver permissão
      toast({
        title,
        description: options?.body
      });
    }
  };

  return {
    permission,
    requestPermission,
    showNotification
  };
};

// Hook para notificações do sistema Logtech
export const useLogtechNotifications = () => {
  const { showNotification, requestPermission, permission } = useNotifications();

  useEffect(() => {
    // Solicita permissão automaticamente se ainda não foi determinada
    if (permission === 'default') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const notifyNewOrder = (pedidoId: string, empresaNome: string) => {
    showNotification('Novo Pedido Recebido', {
      body: `Pedido ${pedidoId} da empresa ${empresaNome}`,
      tag: 'new-order',
      requireInteraction: true
    });
  };

  const notifyOrderDelivered = (pedidoId: string, entregadorNome: string) => {
    showNotification('Pedido Entregue', {
      body: `Pedido ${pedidoId} foi entregue por ${entregadorNome}`,
      tag: 'order-delivered'
    });
  };

  const notifyDeliveryOnline = (entregadorNome: string) => {
    showNotification('Entregador Online', {
      body: `${entregadorNome} ficou disponível para entregas`,
      tag: 'delivery-online'
    });
  };

  const notifyDeliveryOffline = (entregadorNome: string) => {
    showNotification('Entregador Offline', {
      body: `${entregadorNome} ficou offline`,
      tag: 'delivery-offline'
    });
  };

  const notifyOrderStatusUpdate = (pedidoId: string, status: string) => {
    const statusMessages = {
      'enviado': 'foi enviado para coleta',
      'a_caminho': 'está a caminho do destino',
      'entregue': 'foi entregue com sucesso',
      'cancelado': 'foi cancelado'
    };

    const message = statusMessages[status as keyof typeof statusMessages] || `teve status atualizado para ${status}`;

    showNotification('Status do Pedido Atualizado', {
      body: `Pedido ${pedidoId} ${message}`,
      tag: 'order-status'
    });
  };

  return {
    notifyNewOrder,
    notifyOrderDelivered,
    notifyDeliveryOnline,
    notifyDeliveryOffline,
    notifyOrderStatusUpdate,
    requestPermission,
    permission
  };
};