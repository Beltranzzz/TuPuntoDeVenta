// Inicial del negocio para la marca (cuando aún no hay logo)
export const brandInitial = (name: string) => Array.from(name.trim())[0]?.toUpperCase() ?? '•';
