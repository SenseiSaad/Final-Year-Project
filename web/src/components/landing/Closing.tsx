import Link from "next/link";

export function Closing() {
  return (
    <section aria-labelledby="closing-title" className="py-24 md:py-32">
      <div data-reveal className="container-page flex flex-col items-center text-center">
        <h2 id="closing-title" className="display text-[40px] sm:text-[56px]">
          Every answer has a source
        </h2>
        <p className="mt-4 text-[17px] text-ink-2">Test DocuTrust in one click with either early-access account.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard/admin"
            className="inline-flex h-11 items-center rounded-[10px] bg-btn px-5 text-[15px] font-medium text-on-btn transition-[background-color,transform] duration-150 hover:bg-btn-hover active:scale-[0.98]"
          >
            Test as Admin
          </Link>
          <Link
            href="/dashboard/employee"
            className="inline-flex h-11 items-center rounded-[10px] border border-line-strong bg-surface px-5 text-[15px] font-medium text-ink transition-[background-color,transform] duration-150 hover:bg-raised active:scale-[0.98]"
          >
            Test as Employee
          </Link>
        </div>
      </div>
    </section>
  );
}
