"use client";

import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function NavigationStatus() {
  const { pending } = useLinkStatus();
  return <span className="sr-only" role="status" data-navigation-pending={pending}>{pending ? "Loading…" : ""}</span>;
}

/** Warm the full destination only on intent, including keyboard and touch. */
export function NavigationLink({ children, className, onPointerEnter, onFocus, onTouchStart, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();
  function preload() {
    if (typeof props.href === "string") router.prefetch(props.href);
  }
  return (
    <Link
      {...props}
      className={cn("navigation-link", className)}
      onPointerEnter={(event) => { onPointerEnter?.(event); preload(); }}
      onFocus={(event) => { onFocus?.(event); preload(); }}
      onTouchStart={(event) => { onTouchStart?.(event); preload(); }}
    >
      {children}
      <NavigationStatus />
    </Link>
  );
}
