import { Metadata } from "next";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign In | XUBI",
  description: "Sign in to your XUBI Apprentice Learning Portal account",
};

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <SignInForm />
    </main>
  );
}
