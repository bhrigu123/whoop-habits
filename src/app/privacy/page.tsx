import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - Whoop Habits",
};

const LAST_UPDATED = "August 1, 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/logo.png" alt="" width={24} height={24} className="rounded-md" />
          Whoop Habits
        </Link>
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
      </header>

      <Section title="What Whoop Habits is">
        <p>
          Whoop Habits is a habit-tracking app that connects to your WHOOP
          account and automatically fills in habits (like hours slept or weekly
          workouts) from your WHOOP data. This policy explains what data we
          access, what we store, and what we never do with it.
        </p>
      </Section>

      <Section title="Data we access from WHOOP">
        <p>
          When you connect your WHOOP account, you grant us read-only access to:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="text-foreground">Basic profile</span> - your name,
            email address, and WHOOP user ID, used to create and identify your
            account.
          </li>
          <li>
            <span className="text-foreground">Sleep activity</span> - sleep
            timing, duration, and sleep scores.
          </li>
          <li>
            <span className="text-foreground">Workouts</span> - activity type,
            timing, and strain scores.
          </li>
        </ul>
        <p>
          We do not request access to recovery data, body measurements, or any
          other WHOOP data category, and we can never write anything to your
          WHOOP account.
        </p>
      </Section>

      <Section title="How authentication works">
        <p>
          We never see or store your WHOOP password. The connection is made via
          OAuth through Vercel Connect, which securely holds the access and
          refresh tokens for your WHOOP grant. Our servers request short-lived
          tokens at the moment they sync your data and never persist them.
        </p>
      </Section>

      <Section title="What we store">
        <p>
          Your profile fields (name, email, WHOOP user ID, timezone), your
          synced sleep and workout records, the habits you configure, manual
          check-offs, and session cookies for keeping you signed in. Data is
          stored in a Neon (PostgreSQL) database and processed on Vercel
          infrastructure.
        </p>
      </Section>

      <Section title="What we never do">
        <ul className="list-disc space-y-1 pl-5">
          <li>We never sell your data.</li>
          <li>We never share your data with third parties beyond the infrastructure providers named above.</li>
          <li>We never show ads or use your data for advertising.</li>
          <li>We never use your data for anything other than showing you your own habits.</li>
        </ul>
      </Section>

      <Section title="Deleting your data">
        <p>
          You can revoke Whoop Habits&apos; access at any time from the WHOOP
          app (Settings → Integrations) or your WHOOP account page - this
          immediately stops all syncing. To have your stored data fully
          deleted, contact us (below) and we&apos;ll remove your account and
          all associated records.
        </p>
      </Section>

      <Section title="Changes & contact">
        <p>
          If this policy changes materially, the &quot;last updated&quot; date
          above will change with it. Questions or deletion requests:{" "}
          <a
            href="https://github.com/bhrigu123/whoop-habits/issues"
            className="text-foreground underline underline-offset-2"
          >
            github.com/bhrigu123/whoop-habits
          </a>
          .
        </p>
      </Section>

      <footer className="border-t pt-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          ← Back to Whoop Habits
        </Link>
      </footer>
    </main>
  );
}
