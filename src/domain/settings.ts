export interface PaymentMethodDef { id: string; label: string }

export type ThemeMode = 'auto' | 'claro' | 'oscuro';

export interface Settings {
  businessName: string;
  currency: string;
  paymentMethods: PaymentMethodDef[];
  expenseCategories: string[];
  productCategories: string[];
  primaryColor: string;
  secondaryColor: string;
  themeMode: ThemeMode;
  lastBackupAt?: string;
  updatedAt?: string; // para sincronizar: gana la configuración más reciente
}

// Valores neutros: el sistema no asume ningún tipo de negocio
export const DEFAULT_SETTINGS: Settings = {
  businessName: 'Tu punto de venta',
  currency: 'MXN',
  paymentMethods: [
    { id: 'efectivo', label: 'Efectivo' },
    { id: 'tarjeta', label: 'Tarjeta' },
    { id: 'transferencia', label: 'Transferencia' },
    { id: 'otro', label: 'Otro' },
  ],
  expenseCategories: ['Inventario', 'Transporte', 'Servicios', 'Publicidad', 'Equipo', 'Otros'],
  productCategories: ['Producto', 'Servicio', 'Otro'],
  primaryColor: '#111111',
  secondaryColor: '#6B7280',
  themeMode: 'auto',
};

export const CURRENCIES = [
  { code: 'MXN', label: 'Peso mexicano (MXN)' },
  { code: 'USD', label: 'Dólar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
];

// Temas prediseñados: cambian solo la identidad visual, la funcionalidad es la misma
export const THEMES = [
  { id: 'neutro', label: 'Neutro', primary: '#111111', secondary: '#6B7280' },
  { id: 'cafeteria', label: 'Cafetería', primary: '#6F4E37', secondary: '#C8A97E' },
  { id: 'tecnologico', label: 'Tecnológico', primary: '#2563EB', secondary: '#111827' },
];

export const COLOR_SWATCHES = [
  { label: 'Negro', hex: '#111111' },
  { label: 'Azul', hex: '#2563EB' },
  { label: 'Azul cielo', hex: '#38BDF8' },
  { label: 'Rosa', hex: '#EC4899' },
  { label: 'Morado', hex: '#7C3AED' },
  { label: 'Verde', hex: '#16A34A' },
  { label: 'Naranja', hex: '#F97316' },
  { label: 'Rojo', hex: '#DC2626' },
  { label: 'Amarillo', hex: '#EAB308' },
  { label: 'Turquesa', hex: '#14B8A6' },
];
