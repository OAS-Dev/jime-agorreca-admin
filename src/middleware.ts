export { default } from 'next-auth/middleware';

export const config = {
  // Protege todo excepto /login y rutas internas de Next
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
};
