// admin/src/components/MediaPicker.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Upload,
  Grid,
  List,
  Trash2,
  Image,
  Video,
  File,
  Check,
  Loader2
} from 'lucide-react';
import { useMedia } from '../hooks/useMedia';
import { useAuth } from '../hooks/useAuth';
import { MediaUpload } from './MediaUpload';

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: any) => void;
  multiple?: boolean;
  selectedIds?: string[];
  fileTypes?: string[];
}

interface MediaItem {
  _id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  altText?: string;
  width?: number;
  height?: number;
  createdAt: string;
}

export const MediaPicker: React.FC<MediaPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  multiple = false,
  selectedIds = [],
  fileTypes = []
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<string[]>(selectedIds);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Load media items
  const loadMedia = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/media?page=${page}&limit=${limit}&search=${searchTerm}${
          fileTypes.length > 0 ? `&fileType=${fileTypes.join(',')}` : ''
        }`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      if (data.success) {
        setMediaItems(data.data.media);
        setTotal(data.data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, fileTypes]);

  useEffect(() => {
    if (isOpen) {
      loadMedia();
    }
  }, [isOpen, loadMedia]);

  // Handle search
  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
      loadMedia();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, loadMedia]);

  // Handle item selection
  const handleSelect = (item: MediaItem) => {
    if (multiple) {
      setSelectedItems(prev =>
        prev.includes(item._id)
          ? prev.filter(id => id !== item._id)
          : [...prev, item._id]
      );
    } else {
      onSelect(item);
      onClose();
    }
  };

  // Confirm selection (for multiple)
  const handleConfirm = () => {
    const selected = mediaItems.filter(item => 
      selectedItems.includes(item._id)
    );
    onSelect(selected);
    onClose();
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return;
    
    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        setMediaItems(prev => prev.filter(item => item._id !== id));
        setSelectedItems(prev => prev.filter(item => item !== id));
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  // Get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-8 h-8" />;
    if (fileType.startsWith('video/')) return <Video className="w-8 h-8" />;
    return <File className="w-8 h-8" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold">Media Library</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search media..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${
                viewMode === 'grid'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${
                viewMode === 'list'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>

        {/* Upload area */}
        {showUpload && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <MediaUpload
              onUploadComplete={(media) => {
                setMediaItems(prev => [media, ...prev]);
                setShowUpload(false);
              }}
              onCancel={() => setShowUpload(false)}
            />
          </div>
        )}

        {/* Media grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <Image className="w-16 h-16 mb-2" />
              <p>No media found</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {mediaItems.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleSelect(item)}
                  className={`relative group rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                    selectedItems.includes(item._id)
                      ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-2'
                      : 'border-transparent hover:border-blue-300'
                  }`}
                >
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    {item.fileType.startsWith('image/') ? (
                      <img
                        src={item.fileUrl}
                        alt={item.altText || item.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-gray-400">
                        {getFileIcon(item.fileType)}
                      </div>
                    )}
                  </div>
                  
                  {selectedItems.includes(item._id) && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">{item.fileName}</p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item._id);
                    }}
                    className="absolute top-2 left-2 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {mediaItems.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleSelect(item)}
                  className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedItems.includes(item._id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="w-12 h-12 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    {item.fileType.startsWith('image/') ? (
                      <img
                        src={item.fileUrl}
                        alt={item.altText || item.fileName}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      getFileIcon(item.fileType)
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.fileName}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <span>{formatFileSize(item.fileSize)}</span>
                      <span>•</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item._id);
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {total} items found
            {multiple && selectedItems.length > 0 && (
              <span className="ml-2 font-medium text-blue-600">
                ({selectedItems.length} selected)
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {multiple && (
              <button
                onClick={handleConfirm}
                disabled={selectedItems.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Select {selectedItems.length > 0 && `(${selectedItems.length})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaPicker;