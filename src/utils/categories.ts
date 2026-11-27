/**
 * Category slugification and SEO copy profiles for programmatic `/events/[category]`
 * discovery pages, homepage category pills and sitemap generation.
 *
 * Slugs are derived deterministically from `v1_event_categories.display_name` so
 * category landing pages work without requiring a database schema migration.
 */

export interface CategoryRecord {
    id: string;
    display_name: string;
}

export interface CategoryFaq {
    question: string;
    answer: string;
}

export interface CategorySeoProfile {
    headline: string;
    intro: string;
    metaDescription: string;
    faqs: CategoryFaq[];
}

/**
 * Converts an event category display name into a deterministic URL-safe slug.
 */
export function slugifyCategory(displayName: string): string {
    return displayName
        .toLowerCase()
        .replace(/&/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Finds the matching approved category record for a route slug.
 */
export function findCategoryBySlug(
    categories: CategoryRecord[],
    slug: string
): CategoryRecord | undefined {
    const normalized = slug.toLowerCase();
    return categories.find((cat) => slugifyCategory(cat.display_name) === normalized);
}

const CURATED_PROFILES: Record<string, CategorySeoProfile> = {
    'arts-entertainment': {
        headline: 'Arts & Entertainment Events',
        intro: 'Explore theatre shows, gallery openings, comedy nights and live creative experiences. Every ticket includes access to the event forum for schedule updates, attendee chat and shared highlights.',
        metaDescription: 'Discover upcoming arts and entertainment events on Lynk-X. Buy tickets with instant checkout and join private event forums.',
        faqs: [
            {
                question: 'How do I find arts and entertainment events near me?',
                answer: 'Browse upcoming shows on this page or use the search bar on the homepage to filter by date, category and tags.',
            },
            {
                question: 'What happens after I buy a ticket?',
                answer: 'Your ticket is ready immediately in your browser and you unlock the private event forum to view updates, chat with attendees and share photos.',
            },
        ],
    },
    'music-nightlife': {
        headline: 'Music & Nightlife Events',
        intro: 'Find concerts, DJ sets, club nights and live music festivals happening near you. Secure your pass in seconds and connect with the crowd inside the dedicated event forum.',
        metaDescription: 'Find upcoming concerts, DJ nights and live music events on Lynk-X. Fast mobile tickets with mobile money and cards plus private event forums.',
        faqs: [
            {
                question: 'How fast do I receive my concert or festival ticket?',
                answer: 'Your ticket is issued right in the event forum after checkout via mobile money or card with no app store download needed.',
            },
            {
                question: 'Can organizers share set times and lineup changes?',
                answer: 'Yes. Organizers post announcements, lineup schedules and venue updates directly inside the private event forum.',
            },
        ],
    },
    'business-professional': {
        headline: 'Business & Professional Events',
        intro: 'Discover conferences, founder mixers, workshops and networking summits. Connect with fellow attendees in the event forum before you even step into the venue.',
        metaDescription: 'Browse upcoming business conferences, seminars and networking events on Lynk-X. Buy tickets and network in private event forums.',
        faqs: [
            {
                question: 'Can attendees network before a conference starts?',
                answer: 'Yes. Every ticket unlocks the event forum so attendees can introduce themselves, ask speakers questions and coordinate meetups ahead of time.',
            },
            {
                question: 'Can organizers issue VIP and speaker ticket tiers?',
                answer: 'Yes. Organizers can configure Early Bird, General Admission, VIP and custom tickets with capacity tracking.',
            },
        ],
    },
    'tech-innovation': {
        headline: 'Tech & Innovation Events',
        intro: 'Join hackathons, developer meetups, AI summits and product launches. Collaborate with builders and founders inside each event forum before, during and after the session.',
        metaDescription: 'Explore upcoming tech meetups, hackathons and innovation summits on Lynk-X. RSVP or buy tickets and join the developer community.',
        faqs: [
            {
                question: 'Are free tech meetups supported on Lynk-X?',
                answer: 'Yes. Organizers can publish free RSVP events or paid conference and every attendee still gets full forum access.',
            },
            {
                question: 'Do I need to install an app to check in?',
                answer: 'No. Your ticket will be in the event forum and work directly in any mobile or desktop browser.',
            },
        ],
    },
    'sports-games': {
        headline: 'Sports & Gaming Events',
        intro: 'Catch live tournaments, community runs, esports competitions and matchday watch parties. Track bracket updates and cheer alongside fans in the event forum.',
        metaDescription: 'Discover upcoming sports events, fitness runs and esports tournaments on Lynk-X. Book tickets and join live fan forums.',
        faqs: [
            {
                question: 'How do organizers manage matchday updates?',
                answer: 'Organizers use the event forum to broadcast fixture changes, check-in gates and live leaderboard announcements.',
            },
            {
                question: 'Can I share matchday photos with other fans?',
                answer: 'Yes. Every event forum includes a shared media wall for attendees to post photos and moments in real time.',
            },
        ],
    },
    'food-drinks': {
        headline: 'Food & Drinks Events',
        intro: 'Taste your way through pop-up dinners, food festivals, wine tastings and culinary markets. Check menu previews and vendor updates inside the event forum.',
        metaDescription: 'Explore food festivals, tastings and pop-up dining events on Lynk-X. Get tickets fast and view event updates in the forum.',
        faqs: [
            {
                question: 'Can I buy multiple tickets for friends at once?',
                answer: 'Yes. Select your preferred ticket tier, choose the quantity and complete checkout in one transaction.',
            },
            {
                question: 'Where do I see dietary or venue notes?',
                answer: 'Event descriptions, disclaimers and organizer announcements inside the forum keep all venue and menu details up to date.',
            },
        ],
    },
    'education-training': {
        headline: 'Education & Training Events',
        intro: 'Level up at hands-on workshops, masterclasses, bootcamps and career seminars. Ask instructors questions and access session updates directly in the event forum.',
        metaDescription: 'Find workshops, masterclasses and training events on Lynk-X. Register online and connect with instructors and peers in the event forum.',
        faqs: [
            {
                question: 'Can instructors share pre-session prep materials?',
                answer: 'Yes. Hosts can pin announcements and answer participant questions inside the private event forum prior to the workshop.',
            },
            {
                question: 'Is there a fee for free community workshops?',
                answer: 'No. Hosting free RSVP events and using the included event forum is completely free on Lynk-X.',
            },
        ],
    },
    'health-wellness': {
        headline: 'Health & Wellness Events',
        intro: 'Discover yoga retreats, outdoor fitness sessions, mindfulness circles and wellness expos. Stay aligned with schedule reminders and group check-ins in the event forum.',
        metaDescription: 'Discover yoga sessions, fitness clubs and wellness retreats on Lynk-X. Reserve your spot and stay updated in the event forum.',
        faqs: [
            {
                question: 'What if an outdoor wellness event has a weather update?',
                answer: 'Organizers can send instant forum announcements to notify all ticket holders of timing or venue adjustments.',
            },
            {
                question: 'How do I access my pass at the venue?',
                answer: 'Open your event forum on any phone browser to show your ticket for fast gate check-in.',
            },
        ],
    },
    'community-social': {
        headline: 'Community & Social Events',
        intro: 'Meet new people at outdoor outings, book clubs, cultural gatherings and neighborhood hangouts. Break the ice in the live forum chat before the event begins.',
        metaDescription: 'Find local community meetups, social outings and cultural events on Lynk-X. Grab tickets and meet attendees in the event forum.',
        faqs: [
            {
                question: 'Who can join a community event forum?',
                answer: 'Only verified ticket holders, RSVP guests and the event organizer have access to each private event forum.',
            },
            {
                question: 'Can I host my own community meetup on Lynk-X?',
                answer: 'Yes. Anyone can create an event page, set up free or paid tickets and launch a community forum in minutes.',
            },
        ],
    },
};

/**
 * Returns SEO headings, meta description and FAQs for a category slug, with a
 * clean dynamic fallback when new categories are added in the database.
 */
export function getCategorySeoProfile(displayName: string, slug: string): CategorySeoProfile {
    const curated = CURATED_PROFILES[slug];
    if (curated) return curated;

    return {
        headline: `${displayName} Events`,
        intro: `Discover upcoming ${displayName} events on Lynk-X. Buy tickets in seconds and unlock the private event forum for live updates, attendee chat and shared photos.`,
        metaDescription: `Browse upcoming ${displayName} events on Lynk-X. Buy tickets online with instant checkout and join dedicated event forums.`,
        faqs: [
            {
                question: `How do I book tickets for ${displayName} events on Lynk-X?`,
                answer: `Choose any upcoming ${displayName} event, select your ticket tier and complete checkout with mobile money or card. Your ticket and event forum unlock immediately.`,
            },
            {
                question: `Can I host my own ${displayName} event on Lynk-X?`,
                answer: 'Yes. Setting up an event page, ticket tiers and a private attendee forum takes just a few minutes with zero upfront cost.',
            },
        ],
    };
}
