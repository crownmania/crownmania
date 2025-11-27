import React, { useState } from 'react';
import styled from 'styled-components';
import { uploadFile } from '../utils/storageUtils';

const UploaderContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  z-index: 1000;
`;

const UploadForm = styled.form`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const FileInput = styled.input`
  display: none;
`;

const FileLabel = styled.label`
  padding: 0.5rem 1rem;
  background: rgba(0, 102, 255, 0.2);
  border: 1px solid rgba(0, 102, 255, 0.3);
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;

  &:hover {
    background: rgba(0, 102, 255, 0.3);
  }
`;

const Select = styled.select`
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
`;

const UploadButton = styled.button`
  padding: 0.5rem 1rem;
  background: var(--light-blue);
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  opacity: ${props => props.disabled ? 0.5 : 1};

  &:not(:disabled):hover {
    background: #0077ff;
  }
`;

const StatusMessage = styled.div`
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${props => props.error ? 'rgba(255, 68, 68, 0.9)' : 'rgba(0, 200, 83, 0.9)'};
  color: white;
  border-radius: 4px;
  font-size: 0.9rem;
  pointer-events: none;
  opacity: ${props => props.show ? 1 : 0};
  transform: translateY(${props => props.show ? '0' : '10px'});
  transition: all 0.3s ease;
`;

export default function FileUploader({ onUploadComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('models');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ message: '', error: false });

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
    setStatus({ message: '', error: false });
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) return;

    try {
      setUploading(true);
      await uploadFile(selectedFile, selectedFolder);
      setStatus({ message: 'Upload successful!', error: false });
      setSelectedFile(null);
      event.target.reset();
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      setStatus({ message: err.message, error: true });
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      setTimeout(() => setStatus({ message: '', error: false }), 3000);
    }
  };

  return (
    <UploaderContainer>
      <StatusMessage 
        show={status.message} 
        error={status.error}
      >
        {status.message}
      </StatusMessage>
      
      <UploadForm onSubmit={handleUpload}>
        <Select 
          value={selectedFolder} 
          onChange={(e) => setSelectedFolder(e.target.value)}
        >
          <option value="models">3D Models</option>
          <option value="images">Images</option>
          <option value="videos">Videos</option>
        </Select>
        
        <FileLabel>
          {selectedFile ? selectedFile.name : 'Choose File'}
          <FileInput 
            type="file" 
            onChange={handleFileSelect}
            accept={
              selectedFolder === 'models' ? '.gltf,.glb' :
              selectedFolder === 'images' ? '.webp,.png,.jpg' :
              '.webm,.mp4'
            }
          />
        </FileLabel>

        <UploadButton 
          type="submit" 
          disabled={!selectedFile || uploading}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </UploadButton>
      </UploadForm>
    </UploaderContainer>
  );
}
