import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  Search,
  FolderOpen,
  FolderClosed,
  FileText,
  Image,
  FileSpreadsheet,
  Presentation,
  File,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { documentService, projectService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const CATEGORIES = [
  'Plans',
  'Reports',
  'Survey',
  'Permits',
  'Insurance',
  'Photos',
  'Presentations',
  'Templates',
];

function getFileIcon(type) {
  switch (type) {
    case 'PDF':
      return <FileText size={28} style={{ color: '#ef4444' }} />;
    case 'Archive':
    case 'Image':
      return <Image size={28} style={{ color: '#8b5cf6' }} />;
    case 'CAD':
      return <FileSpreadsheet size={28} style={{ color: '#10b981' }} />;
    case 'Presentation':
      return <Presentation size={28} style={{ color: '#f59e0b' }} />;
    case 'Word':
    default:
      return <File size={28} style={{ color: '#3b82f6' }} />;
  }
}

function Documents() {
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [collapsedFolders, setCollapsedFolders] = useState({});

  const { data: documents } = useSupabase(documentService.list);
  const { data: projects } = useSupabase(projectService.list);

  const toggleFolder = (category) => {
    setCollapsedFolders((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const filtered = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    const matchesProject =
      projectFilter === 'All' || doc.project === projectFilter;
    return matchesSearch && matchesProject;
  });

  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    docs: filtered.filter((d) => d.category === cat),
  })).filter((g) => g.docs.length > 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title">Documents</h1>
        <Link to="/documents/upload" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Upload size={16} />
          Upload Document
        </Link>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search documents by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: '2.25rem', width: '100%' }}
          />
        </div>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="input"
          style={{ width: 'auto', minWidth: '200px' }}
        >
          <option value="All">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>

        {/* View Toggle */}
        <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: '0.375rem', overflow: 'hidden' }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '0.5rem 0.75rem',
              background: viewMode === 'grid' ? '#2563eb' : '#fff',
              color: viewMode === 'grid' ? '#fff' : '#6b7280',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '0.5rem 0.75rem',
              background: viewMode === 'list' ? '#2563eb' : '#fff',
              color: viewMode === 'list' ? '#fff' : '#6b7280',
              border: 'none',
              borderLeft: '1px solid #e5e7eb',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Folder Sections */}
      {grouped.length === 0 && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
          No documents found.
        </div>
      )}

      {grouped.map(({ category, docs }) => {
        const isCollapsed = collapsedFolders[category];
        return (
          <div key={category} style={{ marginBottom: '1.25rem' }}>
            {/* Folder Header */}
            <button
              onClick={() => toggleFolder(category)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.625rem 0.5rem',
                width: '100%',
                textAlign: 'left',
                borderBottom: '1px solid #e5e7eb',
                marginBottom: isCollapsed ? 0 : '0.75rem',
              }}
            >
              {isCollapsed ? <ChevronRight size={18} style={{ color: '#6b7280' }} /> : <ChevronDown size={18} style={{ color: '#6b7280' }} />}
              {isCollapsed
                ? <FolderClosed size={20} style={{ color: '#f59e0b' }} />
                : <FolderOpen size={20} style={{ color: '#f59e0b' }} />
              }
              <span style={{ fontWeight: 600, fontSize: '1rem', color: '#1f2937' }}>{category}</span>
              <span style={{
                background: '#e5e7eb',
                color: '#4b5563',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '9999px',
                padding: '0.125rem 0.5rem',
                marginLeft: '0.25rem',
              }}>
                {docs.length}
              </span>
            </button>

            {/* Folder Contents */}
            {!isCollapsed && (
              viewMode === 'grid' ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '1rem',
                }}>
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="card"
                      style={{
                        padding: '1rem',
                        cursor: 'pointer',
                        transition: 'box-shadow 0.15s, transform 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '';
                        e.currentTarget.style.transform = '';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{ flexShrink: 0, marginTop: '0.125rem' }}>
                          {getFileIcon(doc.type)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              color: '#1f2937',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={doc.name}
                          >
                            {doc.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                            {doc.project || 'General'}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{doc.uploadDate}</span>
                        <span>{doc.size}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                        {doc.uploadedBy}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card" style={{ overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                        <th style={{ padding: '0.625rem 0.75rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Name</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Project</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Uploaded</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>By</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map((doc) => (
                        <tr
                          key={doc.id}
                          style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.1s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                        >
                          <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {getFileIcon(doc.type)}
                              <span style={{ fontWeight: 500, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px', display: 'inline-block' }} title={doc.name}>
                                {doc.name}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', color: '#6b7280' }}>{doc.project || 'General'}</td>
                          <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', color: '#6b7280' }}>{doc.uploadDate}</td>
                          <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', color: '#6b7280' }}>{doc.uploadedBy}</td>
                          <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', color: '#6b7280' }}>{doc.size}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Documents;
