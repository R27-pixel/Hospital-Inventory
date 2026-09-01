import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  system: {
    ping: () => ipcRenderer.invoke('system:ping'),
    getAppVersion: () => ipcRenderer.invoke('system:version'),
    checkIntegrity: () => ipcRenderer.invoke('system:checkIntegrity'),
  },
  auth: {
    getStatus: () => ipcRenderer.invoke('auth:getStatus'),
    setupAccounts: (payload: any) => ipcRenderer.invoke('auth:setup', payload),
    login: (credentials: { loginId: string; password: string }) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    changePassword: (params: { targetRole: 'STAFF' | 'MASTER'; currentPassword?: string; newPassword: string }) => ipcRenderer.invoke('auth:changePassword', params),
  },
  suppliers: {
    getAll: (includeArchived?: boolean) => ipcRenderer.invoke('suppliers:getAll', includeArchived),
    create: (data: any) => ipcRenderer.invoke('suppliers:create', data),
    update: (data: any) => ipcRenderer.invoke('suppliers:update', data),
    archive: (id: number) => ipcRenderer.invoke('suppliers:archive', id),
  },
  products: {
    getAll: (includeArchived?: boolean) => ipcRenderer.invoke('products:getAll', includeArchived),
    create: (data: any) => ipcRenderer.invoke('products:create', data),
    update: (data: any) => ipcRenderer.invoke('products:update', data),
    archive: (id: number) => ipcRenderer.invoke('products:archive', id),
  },
  batches: {
    getByProduct: (productId: number) => ipcRenderer.invoke('batches:getByProduct', productId),
    getAll: () => ipcRenderer.invoke('batches:getAll'),
  },
  purchases: {
    getAll: () => ipcRenderer.invoke('purchases:getAll'),
    create: (input: any) => ipcRenderer.invoke('purchases:create', input),
    delete: (payload: { id: number; reason?: string } | number) => ipcRenderer.invoke('purchases:delete', payload),
  },
  reports: {
    getGstSummary: (startDate: string, endDate: string) => ipcRenderer.invoke('reports:getGstSummary', { startDate, endDate }),
    getExpiryReport: () => ipcRenderer.invoke('reports:getExpiryReport'),
    exportPdf: (params?: { defaultPath?: string; targetPath?: string }) => ipcRenderer.invoke('reports:exportPdf', params),
    print: () => ipcRenderer.invoke('reports:print'),
  },
  backup: {
    trigger: () => ipcRenderer.invoke('backup:trigger'),
    getLogs: () => ipcRenderer.invoke('backup:getLogs'),
  },
  stock: {
    exit: (data: any) => ipcRenderer.invoke('stock:exit', data),
    getExitHistory: () => ipcRenderer.invoke('stock:getExitHistory'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
