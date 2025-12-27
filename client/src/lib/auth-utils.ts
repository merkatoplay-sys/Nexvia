export function isUnauthorizedError(error: Error): boolean {
  return error.message === 'Unauthorized' || 
         error.message === 'No autorizado' ||
         error.message === 'Token inválido o expirado' ||
         /^401/.test(error.message);
}

export function redirectToLogin(toast?: (options: { title: string; description: string; variant: string }) => void) {
  if (toast) {
    toast({
      title: "No autorizado",
      description: "Tu sesión ha expirado. Redirigiendo...",
      variant: "destructive",
    });
  }
  setTimeout(() => {
    window.location.href = "/login";
  }, 500);
}
