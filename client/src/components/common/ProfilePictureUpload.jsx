import React, { useState, useRef } from 'react';
import { FaCamera, FaSpinner, FaUser, FaCloudUploadAlt } from 'react-icons/fa';
import authApi from '../../api/authApi';
import toast from 'react-hot-toast';
import { getUploadBaseUrl } from '../../utils/apiConfig';

const ProfilePictureUpload = ({ currentImage, onUploadSuccess, size = 'large' }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return toast.error('Please select an image file');
    }

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Image must be less than 5MB');
    }

    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      setUploading(true);
      // We need to add this to authApi or use axios directly
      const response = await authApi.updateProfilePicture(formData);
      if (response.success) {
        toast.success('Profile picture updated');
        if (onUploadSuccess) onUploadSuccess(response.profilePicture);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const API_BASE = getUploadBaseUrl();
  const imageUrl = currentImage ? `${API_BASE}/${currentImage}` : null;

  const sizeClasses = {
    small: 'w-12 h-12 text-sm',
    medium: 'w-24 h-24 text-xl',
    large: 'w-32 h-32 text-3xl'
  };

  return (
    <div className="relative group">
      <div 
        className={`${sizeClasses[size]} rounded-3xl overflow-hidden bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center text-slate-300 relative`}
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt="Profile" 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = ''; // Fallback to icon if image fails
              e.target.classList.add('hidden');
            }}
          />
        ) : (
          <FaUser />
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
            <FaSpinner className="animate-spin" />
          </div>
        )}
      </div>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={triggerUpload}
        disabled={uploading}
        className="absolute -bottom-2 -right-2 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-2xl shadow-lg transition-all scale-90 group-hover:scale-100 disabled:opacity-50"
        title="Upload Photo"
      >
        <FaCamera />
      </button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
};

export default ProfilePictureUpload;
