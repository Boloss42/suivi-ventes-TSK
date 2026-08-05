import type { NextAuthConfig } from "next-auth";

/**
 * Config "edge-safe" : ne référence ni Prisma ni bcrypt (incompatibles avec le
 * runtime edge du middleware). La logique d'authentification réelle est
 * ajoutée dans auth.ts, qui étend cette config pour le reste de l'app.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const { pathname } = nextUrl;

      const isStaffArea = pathname.startsWith("/staff");
      const isClientArea = pathname.startsWith("/client");

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
    // pas les champs role/clientId et authorized() ci-dessus échoue toujours
    // -> boucle de redirection /login <-> /.
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.clientId = user.clientId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role;
      session.user.clientId = token.clientId;
      return session;
    },
  },
} satisfies NextAuthConfig;
