import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Event Details | Lynk-X",
    description: "View full event details, schedule, and ticket options.",
};

export default function EventDetailsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
