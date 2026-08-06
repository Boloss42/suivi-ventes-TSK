import type { NextAuthConfig } from "next-auth";

/**
 * Config "edge-safe" : ne référence ni Prisma ni bcrypt (incompatibles avec le
 * runtime edge du middleware). La logique d'authentification réelle est
 * ajoutée dans auth.ts, qui étend cette config pour le reste de l'app.
 */
export const authConfig = {
  // Nécessaire derrière un reverse proxy (Railway, Render...) : sans ça,
  // Auth.js refuse de faire confiance au nom de domaine transmis par l'hébergeur
  // et renvoie "There was a problem with the server configuration".
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const { pathname } = nextUrl;

      const isAdminArea = pathname.startsWith("/admin");
      const isStaffArea = pathname.startsWith("/staff");
      const isClientArea = pathname.startsWith("/client");

      if (isAdminArea) {
        return isLoggedIn && role === "SUPER_ADMIN";
      }

      if (isStaffArea) {
        return isLoggedIn && role === "STAFF";
      }

      if (isClientArea) {
        return isLoggedIn && role === "CLIENT";
      }

      return true;
    },
    // Ces callbacks ne dépendent ni de Prisma ni de bcrypt : ils doivent être
    // partagés avec le middleware (edge), sinon le token décodé côté edge n'a
    // pas les champs role/clientId/agencyId et authorized() ci-dessus échoue
    // toujours -> boucle de redirection /login <-> /.
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.clientId = user.clientId;
        token.agencyId = user.agencyId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role;
      session.user.clientId = token.clientId;
      session.user.agencyId = token.agencyId;
      return session;
    },
  },
} satisfies NextAuthConfig;
