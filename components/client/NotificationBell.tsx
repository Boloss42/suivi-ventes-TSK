"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { markAllNotificationsRead } from "@/lib/actions/notifications";

export type NotificationItem = {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  vehicleId: string;
};

export default function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(unreadCount > 0);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasUnread(unreadCount > 0);
  }, [unreadCount]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleOpen() {
    setOpen((v) => !v);
    if (!open && hasUnread) {
      setHasUnread(false);
      startTransition(() => {
        markAllNotificationsRead();
      });
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative rounded-md border border-ink-200 p-2 text-ink-700 transition hover:bg-ink-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {hasUnread && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-500" />
        )}
      </button>

      {open && (
        <div
          className="fixed inset-x-4 top-16 z-20 rounded-lg border border-ink-100 bg-white shadow-lg
                     sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80"
        >
          <div className="border-b border-ink-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-ink-800">Notifications</h3>
          </div>
          <div className="max-h-[70vh] overflow-y-auto sm:max-h-96">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-400">
                Aucune notification pour le moment.
              </p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={`/client/vehicles/${n.vehicleId}`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 text-sm transition hover:bg-ink-50"
                    >
                      <p className={n.read ? "text-ink-600" : "font-medium text-ink-900"}>
                        {n.message}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
