import styles from '../../page.module.css';
import adminStyles from '../page.module.css';

export default function AdminIntegrationsPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>API & Integrations</h1>
                    <p className={styles.subtitle}>Manage API keys, webhooks, and third-party services.</p>
                </div>
            </header>

            <div className={styles.contentGrid}>
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>API Keys</h2>
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--color-interface-outline)',
                            borderRadius: '8px',
                            marginBottom: '12px'
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '14px' }}>Public Key</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>pk_live_51J9...2x9s</div>
                            </div>
                            <button className={adminStyles.btnSecondary} style={{ padding: '6px 12px', fontSize: '12px' }}>Copy</button>
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--color-interface-outline)',
                            borderRadius: '8px'
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '14px' }}>Secret Key</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>sk_live_51J9...9v2a</div>
                            </div>
                            <button className={adminStyles.btnSecondary} style={{ padding: '6px 12px', fontSize: '12px' }}>Reveal</button>
                        </div>
                        <button className={adminStyles.btnPrimary} style={{ marginTop: '16px', fontSize: '13px', padding: '8px 16px' }}>
                            Roll Keys
                        </button>
                    </div>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Webhooks</h2>
                    <div style={{ padding: '32px', textAlign: 'center', opacity: 0.5, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--color-interface-outline)' }}>
                        <p style={{ marginBottom: '12px' }}>No webhooks configured.</p>
                        <button className={adminStyles.btnSecondary} style={{ fontSize: '13px', padding: '8px 16px' }}>
                            + Add Endpoint
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
