import React, { useState } from 'react';
import { API_URL } from '../../config';

// Simple Image Upload Component
const ImageUpload = ({ currentImage, onUpload, label = "Foto de Perfil" }) => {
    const [preview, setPreview] = useState(currentImage);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview immediate
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        // Upload
        const formData = new FormData();
        formData.append('image', file);

        setUploading(true);
        try {
            const res = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                onUpload(data.url);
            } else {
                console.error('Upload failed:', data.error);
                alert('Error al subir imagen');
            }
        } catch (err) {
            console.error('Upload network error:', err);
            alert('Error de conexión al subir imagen');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <label style={{ color: '#ccc', fontSize: '0.9rem' }}>{label}</label>
            <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px dashed #555',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#222',
                position: 'relative'
            }}>
                {preview ? (
                    <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <span style={{ color: '#555', fontSize: '2rem' }}>📷</span>
                )}

                {uploading && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                        color: 'white', fontSize: '0.8rem'
                    }}>Subiendo...</div>
                )}
            </div>
            <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ fontSize: '0.8rem', color: '#aaa', maxWidth: '200px' }}
            />
        </div>
    );
};

export default ImageUpload;
