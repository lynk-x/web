import Link from 'next/link';
import HomeLayout from '@/components/public/home/HomeLayout';
import Footer from '@/components/public/shared/Footer';

/**
 * Branded 404 page keeping lost visitors and search crawlers connected to active
 * event discovery and the main navigation footer.
 */
export default function NotFound() {
  return (
    <HomeLayout hideCart={true} showBack={true}>
      <div
        style={{
          minHeight: '65vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '64px 20px',
          gap: '16px',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 800,
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-utility-primaryText)',
          }}
        >
          Page Not Found
        </h1>
        <p
          style={{
            maxWidth: '480px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '16px',
            lineHeight: 1.6,
          }}
        >
          The page or event you are looking for may have moved, ended or been removed. Explore upcoming events on Lynk-X instead.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '12px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Link
            href="/events"
            style={{
              padding: '12px 24px',
              borderRadius: '9999px',
              background: 'var(--color-brand-primary)',
              color: 'var(--color-utility-secondaryText)',
              fontWeight: 700,
              fontSize: '15px',
            }}
          >
            Browse Upcoming Events
          </Link>
          <Link
            href="/"
            style={{
              padding: '12px 24px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              color: 'var(--color-utility-primaryText)',
              fontWeight: 600,
              fontSize: '15px',
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>
      <Footer />
    </HomeLayout>
  );
}
