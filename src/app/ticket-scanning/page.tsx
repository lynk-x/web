"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
// html5-qrcode is NOT imported statically — it is dynamically imported below
// only when the user has selected an event and the scanner viewport is mounted.
// This removes ~500 KB from the initial bundle for users who never scan.
import type { Html5Qrcode as Html5QrcodeType } from 'html5-qrcode';
import { useToast } from '@/components/ui/Toast';
import styles from './page.module.css';

type EventData = {
    id: string;
    title: string;
    starts_at: string;
};

type ScanResult = 'success' | 'invalid' | 'already_scanned' | null;

export default function TicketScanningPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Setup
    const [events, setEvents] = useState<EventData[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    
    // Scanning state
    // Scanner ref typed with the imported type so TypeScript is happy
    // even though the concrete instance is lazily created below.
    const scannerRef = useRef<Html5QrcodeType | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [scanResult, setScanResult] = useState<ScanResult>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // PIN Login
    const [enteredPin, setEnteredPin] = useState('');
    const [isPinLogin, setIsPinLogin] = useState(false);
    const [pinError, setPinError] = useState('');

    // Settings
    const [showMenu, setShowMenu] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isFlashOn, setIsFlashOn] = useState(false);

    // Audio references
    const successAudio = useRef<HTMLAudioElement | null>(null);
    const errorAudio = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        successAudio.current = new Audio('/audio/success.mp3');
        errorAudio.current = new Audio('/audio/error.mp3');
    }, []);

    const playSound = (type: 'success' | 'error') => {
        if (type === 'success' && successAudio.current) {
            successAudio.current.currentTime = 0;
            successAudio.current.play().catch(e => console.error("Audio play error", e));
        } else if (type === 'error' && errorAudio.current) {
            errorAudio.current.currentTime = 0;
            errorAudio.current.play().catch(e => console.error("Audio play error", e));
        }
    };

    const toggleFlashlight = async () => {
        if (!scannerRef.current || !scannerRef.current.isScanning) return;
        try {
            const newState = !isFlashOn;
            await scannerRef.current.applyVideoConstraints({
                advanced: [{ torch: newState } as any]
            });
            setIsFlashOn(newState);
            showToast(`Flashlight ${newState ? 'ON' : 'OFF'}`, 'success');
        } catch (err) {
            console.error("Failed to toggle flashlight", err);
            showToast("Flashlight is completely unsupported on this device or camera.", "error");
        }
    };

    // 1. Auth & Fetch Events
    useEffect(() => {
        async function fetchAuthorizedEvents() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // Not logged in -> Show PIN login screen
                setIsLoading(false);
                return;
            }
            setUser(session.user);

            try {
                // Determine accounts where user is owner, admin, or scanner
                const { data: memberships } = await supabase
                    .from('account_members')
                    .select('account_id')
                    .eq('user_id', session.user.id)
                    .in('role', ['owner', 'admin', 'scanner']);
                
                if (!memberships || memberships.length === 0) {
                    setIsLoading(false);
                    return;
                }

                const accountIds = memberships.map(m => m.account_id);

                // Fetch upcoming/active events for these accounts
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                const { data: eventsData, error } = await supabase
                    .from('events')
                    .select('id, title, starts_at')
                    .in('account_id', accountIds)
                    .gte('starts_at', yesterday.toISOString())
                    .order('starts_at', { ascending: true });

                if (!error && eventsData) {
                    setEvents(eventsData);
                }
            } catch (err) {
                console.error("Error fetching events", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchAuthorizedEvents();
    }, [supabase, router]);

    // 2. Initialize / Teardown Scanner
    useEffect(() => {
        if (selectedEventId && !scannerRef.current) {
            const startScanner = async () => {
                try {
                    // Dynamic import — only loads the QR library once the user
                    // has selected an event and the #reader DOM node exists.
                    const { Html5Qrcode } = await import('html5-qrcode');
                    scannerRef.current = new Html5Qrcode('reader');

                    await scannerRef.current.start(
                        { facingMode: 'environment' },
                        {
                            fps: 10,
                            // Wide viewport catches 1-D barcodes more reliably
                            qrbox: { width: 350, height: 200 },
                        },
                        (decodedText) => {
                            if (!isProcessing && !scanResult) {
                                handleScanTicket(decodedText);
                            }
                        },
                        (_errorMessage) => {
                            // Per-frame parse failures are expected — suppress them.
                        }
                    );
                    setIsScanning(true);
                } catch (err) {
                    console.error('Error starting scanner', err);
                }
            };

            startScanner();
        }

        return () => {
            if (scannerRef.current && isScanning) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current?.clear();
                    scannerRef.current = null;
                    setIsScanning(false);
                }).catch(e => console.error(e));
            }
        };
    }, [selectedEventId]); // Intentionally omit isProcessing/scanResult — state managed inside callback

    // 3. Process Ticket
    const handleScanTicket = useCallback(async (code: string) => {
        if (!selectedEventId || isProcessing) return;
        setIsProcessing(true);

        // Pause scanner if possible
        if (scannerRef.current?.isScanning) {
            scannerRef.current.pause();
        }

        try {
            const { data, error } = await supabase.rpc('verify_and_use_ticket', {
                p_ticket_code: code.trim(),
                p_event_id: selectedEventId,
                p_scanner_pin: isPinLogin ? enteredPin : null
            });

            if (error) {
                console.error("Validation error:", error);
                setScanResult('invalid');
                playSound('error');
            } else if (data && data.length > 0) {
                const res = data[0];
                if (res.status === 'success') {
                    setScanResult('success');
                    if (!isMuted) playSound('success');
                } else if (res.status === 'already_scanned') {
                    setScanResult('already_scanned');
                    if (!isMuted) playSound('error');
                } else {
                    setScanResult('invalid');
                    if (!isMuted) playSound('error');
                    showToast(res.message || 'Invalid Ticket', 'error');
                }
            } else {
                setScanResult('invalid');
                if (!isMuted) playSound('error');
            }
        } catch (err) {
            console.error("Unknown error validating ticket", err);
            setScanResult('invalid');
            if (!isMuted) playSound('error');
        } finally {
            setManualCode('');
            // Clear result after 2.5s and resume scanning
            setTimeout(() => {
                setScanResult(null);
                setIsProcessing(false);
                if (scannerRef.current?.isScanning) {
                    scannerRef.current.resume();
                }
            }, 2500);
        }
    }, [selectedEventId, isProcessing, supabase]);

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode) {
            handleScanTicket(manualCode);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    // Renders
    if (isLoading) {
        return <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
    }

    if (!user && !isPinLogin) {
        return (
            <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
                <div style={{ background: '#1a1c23', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <Image src="/lynk-x_logo.svg" alt="Lynk-X" width={64} height={64} style={{ marginBottom: '1rem' }} />
                        <h2 style={{ marginTop: 0, fontSize: '1.5rem', fontWeight: 600 }}>Scanner Login</h2>
                        <p style={{ color: '#a0a0a0', fontSize: '0.875rem', margin: 0 }}>Enter your 6-digit Event PIN to start scanning tickets.</p>
                    </div>

                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!enteredPin.trim()) return;
                        setIsProcessing(true);
                        setPinError('');
                        try {
                            const { data, error } = await supabase.rpc('get_event_by_pin', { p_pin: enteredPin.trim() });
                            if (error || !data || data.length === 0) {
                                setPinError('Invalid or expired PIN.');
                            } else {
                                setEvents([{ id: data[0].id, title: data[0].title, starts_at: new Date().toISOString() }]);
                                setSelectedEventId(data[0].id);
                                setIsPinLogin(true);
                            }
                        } catch (err) {
                            console.error(err);
                            setPinError('Connection error. Try again.');
                        } finally {
                            setIsProcessing(false);
                        }
                    }}>
                        <input 
                            type="text" 
                            className={styles.input} 
                            placeholder="6-DIGIT PIN" 
                            value={enteredPin}
                            onChange={(e) => setEnteredPin(e.target.value)}
                            style={{ width: '100%', marginBottom: '1rem', textAlign: 'center', letterSpacing: '4px', fontSize: '1.25rem', padding: '1rem' }}
                            maxLength={8}
                        />
                        {pinError && <div style={{ color: '#f44336', marginBottom: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>{pinError}</div>}
                        
                        <button type="submit" className={styles.btnPrimary} style={{ width: '100%', padding: '1rem' }} disabled={isProcessing}>
                            {isProcessing ? 'Verifying...' : 'Access Scanner'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <button 
                            onClick={() => router.push('/login')} 
                            style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            Or log in as Organizer
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // EVENT SELECTION VIEW
    if (!selectedEventId && !isPinLogin) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Lynk-X Scanner</h1>
                    <button className={styles.logoutBtn} onClick={handleLogout}>Log out</button>
                </header>
                <div className={styles.content}>
                    <p style={{ color: '#a0a0a0', marginBottom: '1rem' }}>Select an event to start scanning tickets.</p>
                    
                    {events.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                            No upcoming events found where you have scanning permissions.
                        </div>
                    ) : (
                        <div className={styles.eventList}>
                            {events.map((evt) => (
                                <div 
                                    key={evt.id} 
                                    className={styles.eventCard}
                                    onClick={() => setSelectedEventId(evt.id)}
                                >
                                    <div className={styles.eventName}>{evt.title}</div>
                                    <div className={styles.eventDate}>
                                        {new Date(evt.starts_at).toLocaleDateString()} at {new Date(evt.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // SCANNER VIEW
    const selectedEvent = events.find(e => e.id === selectedEventId);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button 
                    className={styles.iconBtn} 
                    onClick={() => setSelectedEventId(null)}
                >
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                
                <Image 
                    src="/lynk-x_text.svg" 
                    alt="Lynk-X" 
                    width={200} 
                    height={60} 
                    style={{ objectFit: 'cover' }}
                    priority
                />
                
                <div style={{ position: 'relative' }}>
                    <button className={styles.iconBtn} onClick={() => setShowMenu(!showMenu)}>
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1.5"></circle>
                            <circle cx="12" cy="5" r="1.5"></circle>
                            <circle cx="12" cy="19" r="1.5"></circle>
                        </svg>
                    </button>

                    {showMenu && (
                        <div className={styles.dropdownMenu}>
                            <button 
                                className={styles.dropdownItem}
                                onClick={() => { toggleFlashlight(); setShowMenu(false); }}
                            >
                                <span>Flashlight</span>
                                <span>{isFlashOn ? 'ON' : 'OFF'}</span>
                            </button>
                            <button 
                                className={styles.dropdownItem}
                                onClick={() => { 
                                    setIsMuted(!isMuted); 
                                    setShowMenu(false); 
                                    showToast(`Sound is now ${!isMuted ? 'muted' : 'on'}`, 'success');
                                }}
                            >
                                <span>Sound</span>
                                <span>{isMuted ? 'MUTED' : 'ON'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>
            
            <div className={styles.scannerWrapper}>
                <div id="reader" className={styles.scannerContainer}></div>

                {/* Overlays */}
                {scanResult === 'success' && (
                    <div className={`${styles.overlay} ${styles.overlaySuccess}`}>
                        <svg className={styles.overlayIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <div className={styles.overlayTitle}>Valid Ticket</div>
                        <div className={styles.overlayText}>Admit one</div>
                    </div>
                )}
                
                {scanResult === 'invalid' && (
                    <div className={`${styles.overlay} ${styles.overlayError}`}>
                        <svg className={styles.overlayIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <div className={styles.overlayTitle}>Invalid Ticket</div>
                        <div className={styles.overlayText}>Code not recognized or unauthorized.</div>
                    </div>
                )}

                {scanResult === 'already_scanned' && (
                    <div className={`${styles.overlay} ${styles.overlayError}`} style={{ backgroundColor: '#ff9800' }}>
                        <svg className={styles.overlayIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <div className={styles.overlayTitle}>Already Scanned</div>
                        <div className={styles.overlayText}>This ticket has already been used.</div>
                    </div>
                )}
            </div>

            <form className={styles.manualEntry} onSubmit={handleManualSubmit}>
                <input 
                    type="text" 
                    className={styles.input} 
                    placeholder="Enter manual code..." 
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    disabled={isProcessing}
                />
                <button type="submit" className={styles.btnPrimary} disabled={isProcessing || !manualCode.trim()}>
                    Verify
                </button>
            </form>
        </div>
    );
}
