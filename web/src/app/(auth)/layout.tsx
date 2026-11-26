export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main id="main" tabIndex={-1}>
      {children}
    </main>
  );
}
