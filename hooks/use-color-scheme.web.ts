// En web el esquema efectivo también sale de la preferencia del usuario.
// useResolvedScheme usa useEffect internamente (contexto), por lo que en el
// primer render estático toma el valor por defecto y se ajusta en el cliente.
export { useResolvedScheme as useColorScheme } from '@/ctx/theme';
