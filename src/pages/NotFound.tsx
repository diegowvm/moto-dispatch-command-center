import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card border-border shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-destructive/10 p-3 rounded-full">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">Página Não Encontrada</CardTitle>
            <CardDescription className="text-muted-foreground">
              A página que você está procurando não existe
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Verifique se o endereço está correto ou volte para a página inicial
            </p>
          </div>

          <Button 
            onClick={() => navigate('/')}
            className="w-full"
          >
            <Home className="h-4 w-4 mr-2" />
            Ir para Início
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;