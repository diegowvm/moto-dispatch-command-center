import { useState, useEffect } from 'react';
import { notificationService } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';

interface UseNotificationsReturn {
  isInitialized: boolean;
  isSubscribed: boolean;
  userId: string | null;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  setUserTags: (tags: Record<string, string>) => Promise<void>;
  isLoading: boolean;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        await notificationService.initialize();
        setIsInitialized(true);

        const subscribed = await notificationService.isSubscribed();
        setIsSubscribed(subscribed);

        if (subscribed) {
          const id = await notificationService.getUserId();
          setUserId(id);
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeNotifications();
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    try {
      const granted = await notificationService.requestPermission();
      if (granted) {
        toast({
          title: 'Notificações ativadas',
          description: 'Você receberá notificações sobre atualizações importantes.',
        });
        setIsSubscribed(true);
        const id = await notificationService.getUserId();
        setUserId(id);
      } else {
        toast({
          title: 'Permissão negada',
          description: 'Você pode ativar as notificações nas configurações do navegador.',
          variant: 'destructive',
        });
      }
      return granted;
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        title: 'Erro ao solicitar permissão',
        description: 'Não foi possível ativar as notificações.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const subscribe = async (): Promise<boolean> => {
    try {
      const success = await notificationService.subscribeUser();
      if (success) {
        setIsSubscribed(true);
        const id = await notificationService.getUserId();
        setUserId(id);
        toast({
          title: 'Inscrito com sucesso',
          description: 'Você receberá notificações sobre pedidos e entregas.',
        });
      }
      return success;
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({
        title: 'Erro na inscrição',
        description: 'Não foi possível se inscrever para notificações.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const setUserTags = async (tags: Record<string, string>): Promise<void> => {
    try {
      await notificationService.setUserTags(tags);
    } catch (error) {
      console.error('Error setting user tags:', error);
    }
  };

  return {
    isInitialized,
    isSubscribed,
    userId,
    requestPermission,
    subscribe,
    setUserTags,
    isLoading
  };
};