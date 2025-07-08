import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, Home, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const AcessoNegado = () => {
  const { usuario, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card border-border shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-destructive/10 p-3 rounded-full">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">Acesso Negado</CardTitle>
            <CardDescription className="text-muted-foreground">
              Você não tem permissão para acessar o dashboard administrativo
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Olá, <span className="font-medium text-foreground">{usuario?.nome}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Seu tipo de conta: <span className="font-medium text-foreground capitalize">{usuario?.tipo}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Apenas administradores podem acessar esta área. 
              Entre em contato com o suporte se você acredita que isso é um erro.
            </p>
          </div>

          <div className="flex flex-col space-y-2">
            <Button 
              onClick={() => navigate('/')}
              variant="outline" 
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Voltar ao Início
            </Button>
            
            <Button 
              onClick={handleLogout}
              variant="destructive" 
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Fazer Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcessoNegado;