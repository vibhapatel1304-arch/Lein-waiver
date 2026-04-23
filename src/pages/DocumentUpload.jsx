import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, X } from 'lucide-react';
import { projectService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const categories = [
  'Plans', 'Reports', 'Survey', 'Permits', 'Insurance',
  'Photos', 'Presentations', 'Templates', 'Contracts', 'Specifications', 'Other',
];

export default function DocumentUpload() {
  const navigate = useNavigate();
  const { data: projects } = useSupabase(projectService.list);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('all');

  const handleBrowse = () => {
    const fakeName = 'Site_Survey_Report_2026.pdf';
    setSelectedFile(fakeName);
    if (!documentName) setDocumentName(fakeName.replace(/\.[^.]+$/, '').replace(/_/g, ' '));
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleUpload = () => {
    alert('Document uploaded successfully (UI only).');
    navigate('/documents');
  };

  const labelStyle = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem',
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/documents')}
          style={{
            background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.875rem', fontWeight: 500, padding: 0, marginBottom: '0.5rem',
          }}
        >
          <ArrowLeft size={16} /> Back to Documents
        </button>
        <h1 className="page-title">Upload Document</h1>
      </div>

      {/* Form Card */}
      <div className="card" style={{ padding: '2rem', maxWidth: '720px' }}>
        {/* File Upload Area */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>File</label>

          {!selectedFile ? (
            <div
              onClick={handleBrowse}
              style={{
                border: '2px dashed #cbd5e1', borderRadius: '0.75rem', padding: '2.5rem 1.5rem',
                textAlign: 'center', cursor: 'pointer', background: '#f8fafc',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
            >
              <Upload size={36} style={{ color: '#94a3b8', marginBottom: '0.75rem' }} />
              <p style={{ color: '#475569', fontWeight: 500, marginBottom: '0.5rem' }}>
                Drag and drop files here or click to browse
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={(e) => { e.stopPropagation(); handleBrowse(); }}
                style={{ marginTop: '0.25rem' }}
              >
                Browse Files
              </button>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.75rem' }}>
                File upload simulated
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.75rem 1rem',
                background: '#f8fafc',
              }}
            >
              <FileText size={24} style={{ color: '#3b82f6', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 500, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedFile}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>2.4 MB</p>
              </div>
              <button
                onClick={handleRemoveFile}
                style={{
                  background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
                  padding: '0.25rem', borderRadius: '0.25rem', display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Document Name */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Document Name</label>
          <input
            className="input"
            type="text"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="Enter document name"
          />
        </div>

        {/* Project */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Project</label>
          <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">General / No Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Description / Notes */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Description / Notes</label>
          <textarea
            className="input"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any notes or description for this document..."
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Visibility */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>Visibility</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[
              { value: 'all', label: 'All Team Members' },
              { value: 'project', label: 'Project Team Only' },
              { value: 'admin', label: 'Admin Only' },
            ].map((opt) => (
              <label
                key={opt.value}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#334155' }}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  checked={visibility === opt.value}
                  onChange={(e) => setVisibility(e.target.value)}
                  style={{ accentColor: '#3b82f6' }}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
          <button className="btn-secondary" onClick={() => navigate('/documents')}>Cancel</button>
          <button className="btn-primary" onClick={handleUpload}>
            <Upload size={16} /> Upload Document
          </button>
        </div>
      </div>
    </div>
  );
}
