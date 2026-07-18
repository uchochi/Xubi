import { Metadata } from "next";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = {
  title: "Sign Up | XUBI",
  description: "Create your XUBI Apprentice Learning Portal account",
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <SignUpForm />
    </main>
  );
}
