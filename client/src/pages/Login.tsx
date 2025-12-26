import { useState } from 'react';
import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MonitorPlay, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const { login } = useStreaming();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = login(email, password);
    if (!success) {
      setError('Credenciales inválidas');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <MonitorPlay className="h-10 w-10 text-primary mr-2" />
            <span className="text-3xl font-display font-bold text-white tracking-wider">
              STREAM<span className="text-primary">MGR</span>
            </span>
          </div>
          <p className="text-muted-foreground">Ingresa tus credenciales para continuar</p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" /> Iniciar Sesión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Correo Electrónico</label>
                <Input
                  type="email"
                  placeholder="admin@streammgr.com"
                  className="glass-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Contraseña</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="glass-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white mt-4">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
