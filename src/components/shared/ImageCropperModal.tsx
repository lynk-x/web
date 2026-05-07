"use client";

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ImageCropperModal.module.css';
import { getCroppedImg } from '@/utils/crop';

interface ImageCropperModalProps {
    isOpen: boolean;
    image: string | null;
    aspectRatio?: number;
    title?: string;
    onClose: () => void;
    onCropComplete: (croppedBlob: Blob) => void;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
    isOpen,
    image,
    aspectRatio = 16 / 9,
    title = 'Crop Image',
    onClose,
    onCropComplete,
}) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onCropCompleteCallback = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (!image || !croppedAreaPixels) return;

        try {
            setIsProcessing(true);
            const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
            if (croppedBlob) {
                onCropComplete(croppedBlob);
                onClose();
            }
        } catch (e) {
            console.error('Failed to crop image', e);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && image && (
                <div className={styles.overlay}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={styles.modal}
                    >
                        <div className={styles.header}>
                            <h3>{title}</h3>
                            <button onClick={onClose} className={styles.closeBtn}>&times;</button>
                        </div>

                        <div className={styles.cropperContainer}>
                            <Cropper
                                image={image}
                                crop={crop}
                                zoom={zoom}
                                aspect={aspectRatio}
                                onCropChange={onCropChange}
                                onCropComplete={onCropCompleteCallback}
                                onZoomChange={onZoomChange}
                                objectFit="contain"
                            />
                        </div>

                        <div className={styles.controls}>
                            <div className={styles.zoomControl}>
                                <span>Zoom</span>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => onZoomChange(Number(e.target.value))}
                                    className={styles.slider}
                                />
                            </div>

                            <div className={styles.actions}>
                                <button
                                    onClick={onClose}
                                    className={styles.cancelBtn}
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className={styles.saveBtn}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Processing...' : 'Save & Continue'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ImageCropperModal;
