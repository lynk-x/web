import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Checkout | Lynk-X",
    description: "Securely complete your ticket purchase for the event.",
};

export default function CheckoutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
