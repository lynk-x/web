"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import styles from '../../page.module.css';
import localStyles from './page.module.css';
import { useToast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import ProductTour from '@/components/dashboard/ProductTour';

const SIZES = ['All', '320x480', '468x60'];

const UPLOAD_SIZES = [
    { name: 'Mobile Interstitial', value: '320x480' },
    { name: 'Full Banner', value: '468x60' },
];

export default function AdsAssetsPage() {
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();

    const [assets, setAssets] = useState<any[]>([]);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSize, setSelectedSize] = useState('All');
    const [isUploading, setIsUploading] = useState(false);

    // Upload Flow State
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [tempSelectedSize, setTempSelectedSize] = useState<string | null>(null);
    const [tempSelectedCampaignId, setTempSelectedCampaignId] = useState<string>('');

    // Delete Confirmation State
    const [assetToDelete, setAssetToDelete] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchAssets = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            // Fetch campaigns for this account first, then scope assets to those campaign IDs.
            // This prevents assets from other accounts appearing in the library.
            const { data: campaignData } = await supabase
                .from('ad_campaigns')
                .select('id, title')
                .eq('account_id', activeAccount.id);
            const ownCampaigns = campaignData || [];
            setCampaigns(ownCampaigns);

            if (ownCampaigns.length === 0) {
                setAssets([]);
                setIsLoading(false);
                return;
            }

            const campaignIds = ownCampaigns.map(c => c.id);
            const { data, error } = await supabase
                .from('ad_media')
                .select('*, ad_campaigns(title)')
                .in('campaign_id', campaignIds)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAssets(data || []);
        } catch (error: any) {
            showToast(error.message || 'Failed to fetch assets', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast]);

    useEffect(() => {
        if (!isOrgLoading) {
            if (activeAccount) {
                fetchAssets();
            } else {
                setIsLoading(false);
            }
        }
    }, [isOrgLoading, activeAccount, fetchAssets]);

    const filteredAssets = assets.filter(asset => {
        if (selectedSize === 'All') return true;
        return asset.metadata?.dimensions === selectedSize;
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
        setShowUploadModal(true);
    };

    const handleSizeContinue = () => {
        if (tempSelectedSize && tempSelectedCampaignId) {
            fileInputRef.current?.click();
        } else {
            showToast('Please select both a format and a campaign.', 'warning');
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !tempSelectedSize || !tempSelectedCampaignId) return;

        setIsUploading(true);
        setShowUploadModal(false);

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

        try {
            // 1. Upload to Storage
            const fileExt = file.name.split('.').pop();
            const filePath = `${activeAccount!.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('ad_media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('ad_media')
                .getPublicUrl(filePath);

            // 3. Insert into ad_media
            const { error: insertError } = await supabase
                .from('ad_media')
                .insert({
                    campaign_id: tempSelectedCampaignId,
                    media_type: file.type.startsWith('video') ? 'video' : 'image',
                    url: publicUrl,
                    metadata: { // Custom field if it exists, otherwise skip or check schema
                        dimensions: tempSelectedSize,
                        originalName: file.name
                    }
                });

            if (insertError) throw insertError;

            showToast(`${file.name} uploaded successfully!`, 'success');
            fetchAssets();
        } catch (error: any) {
            showToast(error.message || 'Failed to upload asset', 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteAsset = async () => {
        if (!assetToDelete) return;
        try {
            const { error } = await supabase
                .from('ad_media')
                .delete()
                .eq('id', assetToDelete);

            if (error) throw error;
            showToast('Asset deleted successfully', 'success');
            fetchAssets();
        } catch (error: any) {
            showToast(error.message || 'Failed to delete asset', 'error');
        } finally {
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
                    className={`${styles.btnPrimary} tour-assets-upload`}
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
            <div className={`${localStyles.filterBar} tour-assets-filter`}>
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
                            <div className={localStyles.assetName}>{asset.metadata?.originalName || 'Unnamed Asset'}</div>
                            <div className={localStyles.assetMeta}>
                                <span>{asset.type} • {asset.metadata?.dimensions || 'Unknown Size'}</span>
                                <span>{asset.ad_campaigns?.title || 'Unknown Campaign'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className={localStyles.modalOverlay} onClick={() => setShowUploadModal(false)}>
                    <div className={localStyles.modalContent} onClick={e => e.stopPropagation()}>
                        <h2 className={localStyles.modalTitle}>Upload Ad Creative</h2>
                        <p className={localStyles.modalSubtitle}>Assets must be linked to a campaign and match the exact dimensions.</p>

                        <div className={localStyles.formGroup} style={{ marginBottom: '24px' }}>
                            <label className={localStyles.label} style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Target Campaign</label>
                            <select
                                className={localStyles.select}
                                value={tempSelectedCampaignId}
                                onChange={e => setTempSelectedCampaignId(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                            >
                                <option value="">Select a Campaign</option>
                                {campaigns.map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                        </div>

                        <label className={localStyles.label} style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Ad Format</label>
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
                            <button className={localStyles.cancelBtn} onClick={() => { setShowUploadModal(false); setTempSelectedSize(null); setTempSelectedCampaignId(''); }}>Cancel</button>
                            <button className={localStyles.continueBtn} disabled={!tempSelectedSize || !tempSelectedCampaignId} onClick={handleSizeContinue}>Pick File</button>
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

            <ProductTour
                storageKey={activeAccount ? `hasSeenAdsAssetsJoyride_${activeAccount.id}` : 'hasSeenAdsAssetsJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Creative Library',
                        content: 'Store and manage all your banners and videos for your ad campaigns.',
                        disableBeacon: true,
                    },
                    {
                        target: '.tour-assets-upload',
                        title: 'Upload Assets',
                        content: 'Click here to upload new creatives. Remember they must match expected dimensions exactly.',
                    },
                    {
                        target: '.tour-assets-filter',
                        title: 'Filter by Size',
                        content: 'Quickly find assets that match specific ad placement sizes.',
                    }
                ]}
            />
        </div>
    );
}
