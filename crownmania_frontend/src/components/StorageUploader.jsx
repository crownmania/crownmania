import React, { useState } from 'react';
import styled from 'styled-components';
import { uploadFile, listFiles } from '../utils/storageUtils';

const UploaderContainer = styled.div`
  padding: 2rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const UploadForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FileInput = styled.input`
  display: none;
`;

const FileLabel = styled.label`
  padding: 0.8rem 1.5rem;
  background: rgba(0, 102, 255, 0.2);
  border: 1px solid rgba(0, 102, 255, 0.3);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  text-align: center;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(0, 102, 255, 0.3);
  }
`;

const Select = styled.select`
  padding: 0.8rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: white;
  cursor: pointer;
`;

const UploadButton = styled.button`
  padding: 0.8rem;
  background: var(--light-blue);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  opacity: ${props => props.disabled ? 0.5 : 1};
  transition: all 0.3s ease;

  &:not(:disabled):hover {
    background: #0077ff;
  }
`;

const FileList = styled.div`
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FileItem = styled.div`
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const FileLink = styled.a`
  color: var(--light-blue);
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

export default function StorageUploader() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('models');
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
    setError(null);
  };

  const handleFolderChange = async (event) => {
    const folder = event.target.value;
    setSelectedFolder(folder);
    try {
      const folderFiles = await listFiles(folder);
      setFiles(folderFiles);
    } catch (err) {
      console.error('Error listing files:', err);
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);
      await uploadFile(selectedFile, selectedFolder);
      
      // Refresh file list
      const updatedFiles = await listFiles(selectedFolder);
      setFiles(updatedFiles);
      
      // Reset file input
      setSelectedFile(null);
      event.target.reset();
    } catch (err) {
      setError(err.message);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <UploaderContainer>
      <UploadForm onSubmit={handleUpload}>
        <Select value={selectedFolder} onChange={handleFolderChange}>
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

        {error && (
          <div style={{ color: '#ff4444', marginTop: '0.5rem' }}>
            Error: {error}
          </div>
        )}
      </UploadForm>

      <FileList>
        {files.map((file) => (
          <FileItem key={file.fullPath}>
            <span>{file.name}</span>
            <FileLink href={file.url} target="_blank" rel="noopener noreferrer">
              View
            </FileLink>
          </FileItem>
        ))}
      </FileList>
    </UploaderContainer>
  );
}
