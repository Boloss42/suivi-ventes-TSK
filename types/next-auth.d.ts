import { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    clientId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      clientId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    clientId: string | null;
  }
}
