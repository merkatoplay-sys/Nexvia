import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Services() {
  const { services, accounts, addService, updateService, deleteService } = useStreaming();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [newService, setNewService] = useState({ name: '', color: '#7B68EE', maxProfiles: 7 });

  const handleAddService = () => {
    if (!newService.name) return;
    if (addService({ name: newService.name, color: newService.color, maxProfiles: newService.maxProfiles, isCustom: true })) {
      setIsAddOpen(false);
      setNewService({ name: '', color: '#7B68EE', maxProfiles: 7 });
    }
  };

  const handleUpdateService = (id: string) => {
    if (!newService.name) return;
    if (updateService(id, { color: newService.color, maxProfiles: newService.maxProfiles })) {
      setEditingId(null);
      setNewService({ name: '', color: '#7B68EE', maxProfiles: 7 });
    }
  };

  const handleDeleteService = async () => {
    if (deleteConfirm.id) {
      await deleteService(deleteConfirm.id);
      setDeleteConfirm({ open: false, id: '', name: '' });
    }
  };

  const startEdit = (service: any) => {
    setEditingId(service.id);
    setNewService({ name: service.name, color: service.color, maxProfiles: service.maxProfiles });
  };

  const getAccountCountForService = (serviceName: string) => {
    return accounts.filter(a => a.serviceName === serviceName).length;
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Servicios</h1>
          <p className="text-muted-foreground">Gestiona los servicios de streaming disponibles.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]" data-testid="button-add-service">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Servicio
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Servicio</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Nombre</label>
                <Input 
                  className="glass-input" 
                  placeholder="Nombre del servicio"
                  value={newService.name} 
                  onChange={e => setNewService({...newService, name: e.target.value})}
                  data-testid="input-service-name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={newService.color}
                    onChange={e => setNewService({...newService, color: e.target.value})}
                    className="w-12 h-10 rounded cursor-pointer"
                    data-testid="input-service-color"
                  />
                  <Input 
                    className="glass-input" 
                    placeholder="#7B68EE"
                    value={newService.color} 
                    onChange={e => setNewService({...newService, color: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Máximo de Perfiles</label>
                <Input 
                  type="number" 
                  className="glass-input" 
                  value={newService.maxProfiles} 
                  onChange={e => setNewService({...newService, maxProfiles: parseInt(e.target.value)})}
                  data-testid="input-service-profiles"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-white/10 hover:bg-white/5 text-white">Cancelar</Button>
              <Button onClick={handleAddService} className="bg-primary text-white" data-testid="button-create-service">Crear Servicio</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {services.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No hay servicios registrados</h3>
            <p className="text-muted-foreground text-center mb-6">
              Agrega tu primer servicio de streaming para comenzar a gestionar tus cuentas.
            </p>
            <Button 
              onClick={() => setIsAddOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="mr-2 h-4 w-4" /> Agregar Servicio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map(service => {
            const accountCount = getAccountCountForService(service.name);
            return (
              <motion.div key={service.id} variants={item} initial="hidden" animate="show">
                <Card className="glass-card relative overflow-hidden group" data-testid={`card-service-${service.id}`}>
                  <div 
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: service.color }}
                  />
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: service.color }}
                        >
                          {service.name.substring(0, 1)}
                        </div>
                        <div>
                          <CardTitle className="text-white text-lg">{service.name}</CardTitle>
                          {service.isCustom && <p className="text-xs text-muted-foreground">Personalizado</p>}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="bg-white/5 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Máximo de Perfiles</p>
                        <p className="text-xl font-bold text-white">{service.maxProfiles}</p>
                      </div>
                      
                      <div className="bg-white/5 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Cuentas Activas</p>
                        <p className="text-xl font-bold text-white">{accountCount}</p>
                      </div>
                      
                      <div className="bg-white/5 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Color Identificador</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div 
                            className="w-6 h-6 rounded border border-white/20"
                            style={{ backgroundColor: service.color }}
                          />
                          <p className="text-sm text-white font-mono">{service.color}</p>
                        </div>
                      </div>

                      {service.isCustom && (
                        <div className="pt-2 flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => startEdit(service)}
                                className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 h-8"
                                data-testid={`button-edit-service-${service.id}`}
                              >
                                <Edit className="h-3 w-3 mr-1" /> Editar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white">
                              <DialogHeader>
                                <DialogTitle>Editar Servicio</DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                  <label className="text-xs text-muted-foreground">Color</label>
                                  <div className="flex gap-2">
                                    <input 
                                      type="color" 
                                      value={newService.color}
                                      onChange={e => setNewService({...newService, color: e.target.value})}
                                      className="w-12 h-10 rounded cursor-pointer"
                                    />
                                    <Input 
                                      className="glass-input" 
                                      value={newService.color} 
                                      onChange={e => setNewService({...newService, color: e.target.value})}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs text-muted-foreground">Máximo de Perfiles</label>
                                  <Input 
                                    type="number" 
                                    className="glass-input" 
                                    value={newService.maxProfiles} 
                                    onChange={e => setNewService({...newService, maxProfiles: parseInt(e.target.value)})}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditingId(null)} className="border-white/10 hover:bg-white/5 text-white">Cancelar</Button>
                                <Button onClick={() => handleUpdateService(service.id)} className="bg-primary text-white">Guardar Cambios</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setDeleteConfirm({ open: true, id: service.id, name: service.name })}
                            className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 h-8"
                            data-testid={`button-delete-service-${service.id}`}
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title={`¿Eliminar servicio "${deleteConfirm.name}"?`}
        description="Esta acción eliminará el servicio y todas las cuentas maestras, perfiles y registros financieros asociados. Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={handleDeleteService}
      />
    </motion.div>
  );
}
