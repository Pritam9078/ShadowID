import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  File,
  Image,
  FileText,
  Video,
  Music,
  Archive,
  X,
  Check,
  AlertCircle,
  Download,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { backendAPI } from '../services/backendApi';

const IPFSFileUpload = ({ onFileUploaded, maxFiles = 5, maxSize = 10485760 }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.startsWith('video/')) return Video;
    if (fileType.startsWith('audio/')) return Music;
    if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
    if (fileType.includes('zip') || fileType.includes('rar')) return Archive;
    return File;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    rejectedFiles.forEach((file) => {
      if (file.errors.some(e => e.code === 'file-too-large')) {
        toast.error(`File ${file.file.name} is too large. Max size is ${formatFileSize(maxSize)}`);
      } else if (file.errors.some(e => e.code === 'too-many-files')) {
        toast.error(`Too many files. Maximum ${maxFiles} files allowed.`);
      }
    });

    // Add accepted files
    if (acceptedFiles.length > 0) {
      const newFiles = acceptedFiles.map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending',
        progress: 0
      }));
      
      setFiles(prev => [...prev, ...newFiles].slice(0, maxFiles));
    }
  }, [maxFiles, maxSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    multiple: true
  });

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const results = [];

    for (const fileItem of files) {
      try {
        // Update progress
        setFiles(prev => 
          prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'uploading', progress: 0 }
              : f
          )
        );

        // Create FormData
        const formData = new FormData();
        formData.append('file', fileItem.file);

        // Upload to IPFS via backend
        const result = await backendAPI.uploadToIPFS(formData, {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setFiles(prev => 
              prev.map(f => 
                f.id === fileItem.id 
                  ? { ...f, progress }
                  : f
              )
            );
          }
        });

        // Update status to success
        setFiles(prev => 
          prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'success', ipfsHash: result.hash, ipfsUrl: result.url }
              : f
          )
        );

        results.push({
          ...result,
          fileName: fileItem.file.name,
          fileSize: fileItem.file.size,
          fileType: fileItem.file.type
        });

        toast.success(`${fileItem.file.name} uploaded successfully`);

      } catch (error) {
        console.error('Upload failed:', error);
        setFiles(prev => 
          prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'error', error: error.message }
              : f
          )
        );
        toast.error(`Failed to upload ${fileItem.file.name}`);
      }
    }

    setUploading(false);
    setUploadedFiles(prev => [...prev, ...results]);
    
    if (onFileUploaded) {
      onFileUploaded(results);
    }

    // Clear files after successful upload
    setTimeout(() => {
      setFiles([]);
    }, 3000);
  };

  const FileItem = ({ fileItem }) => {
    const FileIcon = getFileIcon(fileItem.file.type);
    
    return (
      <motion.div
        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className="w-10 h-10 bg-dao-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileIcon className="w-5 h-5 text-dao-600" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{fileItem.file.name}</p>
          <p className="text-sm text-gray-500">{formatFileSize(fileItem.file.size)}</p>
          
          {/* Progress bar */}
          {fileItem.status === 'uploading' && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-dao-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${fileItem.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{fileItem.progress}% uploaded</p>
            </div>
          )}

          {/* Error message */}
          {fileItem.status === 'error' && (
            <p className="text-sm text-red-600 mt-1">{fileItem.error}</p>
          )}

          {/* Success info */}
          {fileItem.status === 'success' && (
            <div className="mt-2">
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Uploaded to IPFS
              </p>
              <div className="flex gap-2 mt-1">
                <a
                  href={fileItem.ipfsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-dao-600 hover:text-dao-700 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on IPFS
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {fileItem.status === 'success' && (
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600" />
            </div>
          )}
          
          {fileItem.status === 'error' && (
            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
          )}

          {fileItem.status === 'pending' && (
            <button
              onClick={() => removeFile(fileItem.id)}
              className="w-6 h-6 bg-gray-200 hover:bg-red-100 rounded-full flex items-center justify-center group"
            >
              <X className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-dao-500 bg-dao-50' 
            : 'border-gray-300 hover:border-dao-400 hover:bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="w-16 h-16 bg-dao-100 rounded-full flex items-center justify-center mx-auto">
            <Upload className="w-8 h-8 text-dao-600" />
          </div>
          
          {isDragActive ? (
            <div>
              <h3 className="text-lg font-semibold text-dao-700">Drop files here</h3>
              <p className="text-dao-600">Release to upload to IPFS</p>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Upload Files to IPFS</h3>
              <p className="text-gray-600">
                Drag and drop files here, or click to select files
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Max {maxFiles} files, up to {formatFileSize(maxSize)} each
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Files List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h4 className="font-medium text-gray-900">Selected Files</h4>
            {files.map((fileItem) => (
              <FileItem key={fileItem.id} fileItem={fileItem} />
            ))}
            
            {files.some(f => f.status === 'pending') && (
              <div className="flex justify-end">
                <button
                  onClick={uploadFiles}
                  disabled={uploading}
                  className="px-6 py-2 bg-dao-600 hover:bg-dao-700 disabled:bg-gray-300 text-white rounded-lg flex items-center gap-2 font-medium"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Upload to IPFS'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploaded Files History */}
      {uploadedFiles.length > 0 && (
        <div className="border-t pt-6">
          <h4 className="font-medium text-gray-900 mb-4">Recently Uploaded</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {uploadedFiles.slice(-4).map((file, index) => {
              const FileIcon = getFileIcon(file.fileType);
              return (
                <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{file.fileName}</p>
                    <a
                      href={file.ipfsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on IPFS
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default IPFSFileUpload;
