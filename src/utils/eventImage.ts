/**
 * Resolves the single image that represents an event, checked in a fixed
 * priority order. Used by the event detail page's rendered hero image, its
 * social-card (OG/Twitter) metadata, and its Event schema.org JSON-LD — all
 * three must agree on the same image, or a social share can show a blank
 * card for an event that displays a cover image fine on the page itself.
 */
export function getEventImage(event: {
    cover_image_url?: string | null;
    media?: Record<string, unknown> | null;
}): string | undefined {
    const media = event.media as Record<string, unknown> | undefined;
    return (
        event.cover_image_url ||
        (media?.cover_image_url as string | undefined) ||
        (media?.thumbnail_url as string | undefined) ||
        (media?.thumbnail as string | undefined) ||
        (media?.poster as string | undefined) ||
        (media?.hero as string | undefined) ||
        undefined
    );
}
