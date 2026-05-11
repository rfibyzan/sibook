import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import Cropper from 'react-easy-crop';

const SettingsPage: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [role, setRole] = useState('Staff');
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Cropper States
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setRole(profile.role || 'Staff');
    }
  }, [profile]);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleUpdateProfile = async (e?: React.FormEvent, customData?: any) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: '' });

    const updateData = customData || {
      full_name: fullName,
      avatar_url: avatarUrl,
      role: role
    };

    const { error } = await updateProfile(updateData);

    if (error) {
      showAlert('Gagal memperbarui profil: ' + (error.message || 'Error'), 'error');
    } else {
      showAlert('Profil berhasil diperbarui!', 'success');
    }
    setIsLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageToCrop(reader.result?.toString() || null);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg');
    });
  };

  const handleUploadCroppedImage = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    
    setUploading(true);
    try {
      const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (!croppedImageBlob) throw new Error('Gagal memproses gambar.');

      const fileName = `${user?.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedImageBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      setImageToCrop(null);
      
      // Auto save
      await handleUpdateProfile(undefined, {
        full_name: fullName,
        avatar_url: publicUrl,
        role: role
      });
    } catch (error: any) {
      showAlert('Gagal upload: ' + error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = () => {
    showConfirm({
      title: 'Hapus Foto Profil',
      message: 'Apakah Anda yakin ingin menghapus foto profil saat ini?',
      confirmText: 'Ya, Hapus',
      type: 'danger',
      onConfirm: async () => {
        setIsLoading(true);
        const { error } = await updateProfile({
          full_name: fullName,
          avatar_url: '',
          role: role
        });

        if (!error) {
          setAvatarUrl('');
          showAlert('Foto profil telah dihapus.', 'success');
        } else {
          showAlert('Gagal menghapus foto.', 'error');
        }
        setIsLoading(false);
      }
    });
  };

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h2 className="font-display-lg text-display-lg text-on-background">Pengaturan Profil</h2>
          <p className="font-body-sm text-body-sm text-secondary mt-1">Kelola tampilan profil dan sesi Anda.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {/* Profile Sidebar */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 text-center shadow-sm">
              <div className="relative inline-block mb-6">
                <img 
                  src={avatarUrl || "https://ui-avatars.com/api/?name=" + (fullName || 'User') + "&background=random"} 
                  alt="Profile" 
                  className="w-32 h-32 rounded-full border-4 border-surface shadow-md object-cover"
                />
                <div className="absolute -bottom-2 -right-2 flex gap-1">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center border-2 border-surface shadow-lg hover:bg-primary/90 transition-all"
                    title="Ubah Foto"
                  >
                    <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                  </button>
                  {avatarUrl && (
                    <button 
                      onClick={handleDeleteAvatar}
                      className="w-10 h-10 bg-error-container text-on-error-container rounded-full flex items-center justify-center border-2 border-surface shadow-lg hover:bg-error-container/80 transition-all"
                      title="Hapus Foto"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>
              <h3 className="font-title-lg text-on-surface truncate">{fullName || 'User SIBOOK'}</h3>
              <p className="font-body-sm text-secondary truncate">{user?.email}</p>
              <div className="mt-4 inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-[11px] uppercase tracking-widest border border-primary/20">
                {role}
              </div>
            </div>

            <div className="bg-surface-container-low/30 border border-outline-variant rounded-xl p-4">
              <div className="flex items-center gap-3 text-secondary">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
                <p className="text-[12px] leading-tight">Sesi Anda bersifat permanen. Anda tidak akan keluar otomatis saat menutup browser.</p>
              </div>
            </div>
          </div>

          {/* Settings Form */}
          <div className="md:col-span-2">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm">
              <h4 className="font-title-md text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_square</span>
                Informasi Personal
              </h4>

              {message.text && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                  message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-error-container text-on-error-container'
                }`}>
                  <span className="material-symbols-outlined">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                  <p className="font-body-sm">{message.text}</p>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Nama Lengkap</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>

                <div className="flex flex-col gap-1.5 opacity-70">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider flex justify-between">
                    Jabatan / Role
                    <span className="text-[9px] lowercase italic normal-case tracking-normal">(Hanya dapat diubah oleh Admin)</span>
                  </label>
                  <select disabled value={role} className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface-container-low outline-none cursor-not-allowed">
                    <option value="Owner">Owner</option>
                    <option value="Manager">Manager</option>
                    <option value="Kasir">Kasir</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button type="submit" disabled={isLoading} className="bg-primary text-white px-10 py-3.5 rounded-full font-bold shadow-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-all">
                    {isLoading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">save</span>}
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Image Cropper Modal */}
      {imageToCrop && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-headline-sm text-on-surface">Sesuaikan Foto Profil</h3>
              <button onClick={() => setImageToCrop(null)} className="p-2 hover:bg-surface-container rounded-full"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <div className="relative h-[400px] bg-black">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                cropShape="round"
                showGrid={false}
                restrictPosition={true}
              />
            </div>

            <div className="p-8 space-y-8 bg-surface-container-lowest">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-secondary">zoom_in</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setImageToCrop(null)}
                  className="flex-1 py-3.5 rounded-full border border-outline-variant font-bold text-on-surface hover:bg-surface-container transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={handleUploadCroppedImage}
                  disabled={uploading}
                  className="flex-1 py-3.5 rounded-full bg-primary text-white font-bold shadow-lg hover:bg-primary/90 disabled:opacity-50 flex justify-center items-center gap-2 transition-all"
                >
                  {uploading ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : <span className="material-symbols-outlined text-[20px]">check</span>}
                  Terapkan & Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SettingsPage;
