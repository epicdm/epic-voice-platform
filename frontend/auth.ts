import NextAuth from "next-auth";

// Placeholder auth configuration
export const { auth, signIn, signOut, handlers } = NextAuth({
  providers: [],
  pages: {
    signIn: "/auth/signin",
  },
});
