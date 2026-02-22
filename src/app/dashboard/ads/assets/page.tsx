"use client";

import { useState, useRef } from 'react';
import styles from '../../page.module.css';
import localStyles from './page.module.css';
import { useToast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

const INITIAL_ASSETS = [
    { id: '1', name: 'Summer Music Fest', type: 'image', dimensions: '468x60', uploaded: 'Oct 12' },
    { id: '2', name: 'Tech Summit Lead', type: 'image', dimensions: '468x60', uploaded: 'Sep 01' },
    { id: '3', name: 'Promo Video - 15s', type: 'video', dimensions: '320x480', uploaded: 'Nov 05' },
    { id: '4', name: 'Mobile Interstitial', type: 'image', dimensions: '320x480', uploaded: 'Dec 01' },
    { id: '5', name: 'Beach Party Promo', type: 'image', dimensions: '320x480', uploaded: 'Oct 20' },
];

const SIZES = ['All', '320x480', '468x60'];

const UPLOAD_SIZES = [
    { name: 'Mobile Interstitial', value: '320x480' },
    { name: 'Full Banner', value: '468x60' },
];

export default function AdsAssetsPage() {
    const { showToast } = useToast();
    const [assets, setAssets] = useState(INITIAL_ASSETS);
    const [selectedSize, setSelectedSize] = useState('All');
    const [isUploading, setIsUploading] = useState(false);

    // Size Selection State
    const [showSizeModal, setShowSizeModal] = useState(false);
    const [tempSelectedSize, setTempSelectedSize] = useState<string | null>(null);

    // Delete Confirmation State
    const [assetToDelete, setAssetToDelete] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredAssets = assets.filter(asset => {
        if (selectedSize === 'All') return true;
        return asset.dimensions === selectedSize;
    });

    /**
     * Validates that the file pixels match the selected ad slot size.
     */
    const validateDimensions = (file: File, expectedSize: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const [expectedW, expectedH] = expectedSize.split('x').map(Number);
            const url = URL.createObjectURL(file);

            if (file.type.startsWith('image/')) {
                const img = new Image();
                img.onload = () => {
                    URL.revokeObjectURL(url);
                    const matches = img.width === expectedW && img.height === expectedH;
                    resolve(matches);
                };
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    resolve(false);
                };
                img.src = url;
            } else if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.onloadedmetadata = () => {
                    URL.revokeObjectURL(url);
                    const matches = video.videoWidth === expectedW && video.videoHeight === expectedH;
                    resolve(matches);
                };
                video.onerror = () => {
                    URL.revokeObjectURL(url);
                    resolve(false);
                };
                video.src = url;
            } else {
                resolve(true); // Default pass for other types
            }
        });
    };

    const triggerUpload = () => {
        if (selectedSize !== 'All') {
            // Fast-track if already filtered
            setTempSelectedSize(selectedSize);
            setTimeout(() => fileInputRef.current?.click(), 10);
        } else {
            setShowSizeModal(true);
        }
    };

    const handleSizeContinue = () => {
        if (tempSelectedSize) {
            fileInputRef.current?.click();
            setShowSizeModal(false);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !tempSelectedSize) return;

        setIsUploading(true);

        // --- Hard Dimension Validation ---
        const isValid = await validateDimensions(file, tempSelectedSize);
        if (!isValid) {
            const [w, h] = tempSelectedSize.split('x');
            showToast(`Size Mismatch: File must be exactly ${w}x${h} pixels.`, 'error');
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        showToast(`Uploading ${file.name}...`, 'info');

        // Simulate upload delay
        setTimeout(() => {
            const newAsset = {
                id: Math.random().toString(36).substring(2, 9),
                name: file.name.split('.')[0],
                type: file.type.startsWith('video') ? 'video' : 'image',
                dimensions: tempSelectedSize,
                uploaded: 'Just now'
            };

            setAssets(prev => [newAsset, ...prev]);
            setIsUploading(false);
            setTempSelectedSize(selectedSize === 'All' ? null : selectedSize);
            showToast(`${file.name} uploaded successfully!`, 'success');

            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }, 1500);
    };

    const handleDeleteAsset = () => {
        if (assetToDelete) {
            setAssets(prev => prev.filter(a => a.id !== assetToDelete));
            showToast('Asset deleted successfully', 'success');
            setAssetToDelete(null);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Creative Library</h1>
                    <p className={styles.subtitle}>Upload and manage your ad creatives and media assets.</p>
                </div>
                <button
                    className={styles.btnPrimary}
                    onClick={triggerUpload}
                    disabled={isUploading}
                >
                    <span>{isUploading ? 'Validating...' : '+ Upload Asset'}</span>
                </button>
            </header>

            {/* Hidden Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept="image/*,video/*"
            />

            {/* Filter Bar */}
            <div className={localStyles.filterBar}>
                <div className={localStyles.filterGroup}>
                    <span className={localStyles.filterLabel}>Size:</span>
                    {SIZES.map(size => (
                        <button
                            key={size}
                            className={`${localStyles.filterChip} ${selectedSize === size ? localStyles.filterChipActive : ''}`}
                            onClick={() => setSelectedSize(size)}
                        >
                            {size === '320x480' ? '320 x 480' : size === '468x60' ? '468 x 60' : size}
                        </button>
                    ))}
                </div>
            </div>

            <div className={localStyles.grid}>
                {filteredAssets.map((asset) => (
                    <div key={asset.id} className={localStyles.assetCard}>
                        <div className={localStyles.cardHeader}>
                            <button
                                className={localStyles.deleteBtn}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setAssetToDelete(asset.id);
                                }}
                                title="Delete Asset"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        </div>

                        <div className={localStyles.preview}>
                            <span className={localStyles.previewText}>Preview</span>
                        </div>
                        <div className={localStyles.cardContent}>
                            <div className={localStyles.assetName}>{asset.name}</div>
                            <div className={localStyles.assetMeta}>
                                <span>{asset.type} • {asset.dimensions.replace('x', ' x ')}</span>
                                <span>{asset.uploaded}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Size Selection Modal */}
            {showSizeModal && (
                <div className={localStyles.modalOverlay} onClick={() => setShowSizeModal(false)}>
                    <div className={localStyles.modalContent} onClick={e => e.stopPropagation()}>
                        <h2 className={localStyles.modalTitle}>Select Ad Format</h2>
                        <p className={localStyles.modalSubtitle}>Uploads are strictly validated against these dimensions.</p>

                        <div className={localStyles.sizeGrid}>
                            {UPLOAD_SIZES.map(size => (
                                <div
                                    key={size.value}
                                    className={`${localStyles.sizeOption} ${tempSelectedSize === size.value ? localStyles.sizeOptionActive : ''}`}
                                    onClick={() => setTempSelectedSize(size.value)}
                                >
                                    <span className={localStyles.sizeName}>{size.name}</span>
                                    <span className={localStyles.sizeValue}>{size.value.replace('x', ' x ')} px</span>
                                </div>
                            ))}
                        </div>

                        <div className={localStyles.modalActions}>
                            <button className={localStyles.cancelBtn} onClick={() => { setShowSizeModal(false); setTempSelectedSize(null); }}>Cancel</button>
                            <button className={localStyles.continueBtn} disabled={!tempSelectedSize} onClick={handleSizeContinue}>Pick File</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!assetToDelete}
                onClose={() => setAssetToDelete(null)}
                onConfirm={handleDeleteAsset}
                title="Delete Asset"
                message="Are you sure you want to delete this creative? Any campaigns using this asset will be affected."
                confirmLabel="Delete Asset"
                variant="danger"
            />
        </div>
    );
}
