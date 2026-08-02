"use client";

import Image from "next/image";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { startWhoopAuth } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="h-12 gap-2.5 rounded-full px-8 text-base font-semibold"
    >
      {pending ? (
        <>
          <Loader2 className="size-5 animate-spin" />
          Redirecting to WHOOP…
        </>
      ) : (
        <>
          {/* Button is dark in light mode and light in dark mode, so the
              mark swaps the opposite way. */}
          <Image
            src="/whoop-circle-white.svg"
            alt=""
            width={22}
            height={22}
            className="dark:hidden"
          />
          <Image
            src="/whoop-circle-black.svg"
            alt=""
            width={22}
            height={22}
            className="hidden dark:block"
          />
          Continue with WHOOP
        </>
      )}
    </Button>
  );
}

export function ConnectWhoopButton() {
  return (
    <form
      action={(formData: FormData) => {
        // Captured at submit time on the client - no state or effects needed.
        formData.set(
          "timezone",
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        );
        return startWhoopAuth(formData);
      }}
    >
      <SubmitButton />
    </form>
  );
}
