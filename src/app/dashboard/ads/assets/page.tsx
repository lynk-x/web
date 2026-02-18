"use client";

import React from 'react';
import styles from '../../page.module.css';
import localStyles from './page.module.css';

const mockAssets = [
    { id: '1', name: 'Summer Festival Banner', type: 'image', dimensions: '1200x628', uploaded: 'Oct 12' },
    { id: '2', name: 'Tech Summit Logo', type: 'image', dimensions: '500x500', uploaded: 'Sep 01' },
    { id: '3', name: 'Promo Video - 15s', type: 'video', dimensions: '1920x1080', uploaded: 'Nov 05' },
    { id: '4', name: 'Gallery Showcase', type: 'image', dimensions: '1080x1080', uploaded: 'Dec 01' },
    { id: '5', name: 'Product Shot 1', type: 'image', dimensions: '800x800', uploaded: 'Oct 20' },
];

export default function AdsAssetsPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Creative Library</h1>
                    <p className={styles.subtitle}>Upload and manage your ad creatives and media assets.</p>
                </div>
                <button className={styles.createBtn}>
                    <span>+ Upload Asset</span>
                </button>
            </header>

            <div className={localStyles.grid}>
                {mockAssets.map((asset) => (
                    <div key={asset.id} className={localStyles.assetCard}>
                        <div className={localStyles.preview}>
                            {/* Placeholder for actual image */}
                            <span className={localStyles.previewText}>Preview</span>
                        </div>
                        <div className={localStyles.cardContent}>
                            <div className={localStyles.assetName}>{asset.name}</div>
                            <div className={localStyles.assetMeta}>
                                <span>{asset.type} • {asset.dimensions}</span>
                                <span>{asset.uploaded}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Upload Placeholder */}
                <div className={localStyles.uploadCard}>
                    <span className={localStyles.uploadIcon}>+</span>
                    <span className={localStyles.uploadText}>Upload New</span>
                </div>
            </div>
        </div>
    );
}
