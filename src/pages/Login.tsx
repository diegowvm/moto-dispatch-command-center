import { LoginForm } from "@/components/auth/LoginForm";

interface LoginProps {
  onLogin: (credentials: { email: string; password: string }) => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  return <LoginForm onLogin={onLogin} />;
};