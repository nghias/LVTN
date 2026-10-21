import LoginForm from '../../components/features/LoginForm';

export default function AuthPage() {
  return (
    <main className="flex-1 w-full bg-white flex flex-col items-center justify-center p-4 sm:p-6">
      <LoginForm />
    </main>
  );
}