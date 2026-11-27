/**
 * Emits the `SoftwareApplication` JSON-LD block exclusively on marketing and
 * discovery landing pages (`/` and `/for/*`) rather than on every route.
 */
export default function SoftwareAppJsonLd() {
    const softwareApplicationSchema = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        '@id': 'https://lynk-x.app/#software',
        name: 'Lynk-X',
        alternateName: ['Lynk', 'Lynk X'],
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Event Management & Ticketing',
        operatingSystem: 'Web(Progressive Web App)',
        url: 'https://lynk-x.app',
        image: 'https://lynk-x.app/og-image.png?v=2',
        description:
            'All-in-one event ticketing and community platform. Zero-friction mobile ticketing, private event forums, live attendee chat and shared media walls.',
        offers: [
            {
                '@type': 'Offer',
                name: 'Attendee PWA Access',
                price: '0',
                priceCurrency: 'KES',
                description: 'Free access for event discovery, ticket holding and event forum participation',
            },
            {
                '@type': 'Offer',
                name: 'Organizer Self-Serve Hosting',
                price: '0',
                priceCurrency: 'KES',
                description: 'Free event creation and forum management with pay-as-you-sell ticketing',
            },
        ],
        featureList: [
            'Mobile ticketing with instant mobile money and card payments',
            'Automated private event forums for ticket holders',
            'Real-time attendee live chat and announcements',
            'Shared photo and video media wall',
            'Fast ticket barcode check-in scanning',
            'Native sponsor placements with automatic creative optimization',
        ],
        author: {
            '@id': 'https://lynk-x.app/#organization',
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
        />
    );
}
