import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Save, Users, Layers, Loader2 } from 'lucide-react';
import { projectService, clientService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const teamMembers = [
  { name: 'Mike Thornton', role: 'Project Manager' },
  { name: 'Jake Rivera', role: 'Site Superintendent' },
  { name: 'Aisha Patel', role: 'Structural Engineer' },
  { name: 'Carlos Mendes', role: 'Foreman' },
  { name: 'Derek Lawson', role: 'Electrician Lead' },
  { name: 'Samantha Brooks', role: 'Interior Specialist' },
];

const defaultPhases = [
  'Pre-Construction',
  'Foundation',
  'Structural Framing',
  'Exterior',
  'MEP',
  'Interior',
  'Finishing',
];

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.375rem',
};

export default function ProjectCreate() {
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState('');
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Planning');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [contractType, setContractType] = useState('');
  const [selectedTeam, setSelectedTeam] = useState([]);
  const [phases, setPhases] = useState([...defaultPhases]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const { data: clients } = useSupabase(clientService.list);

  const toggleTeamMember = (name) => {
    setSelectedTeam((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const updatePhase = (index, value) => {
    setPhases((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const addPhase = () => {
    setPhases((prev) => [...prev, '']);
  };

  const removePhase = (index) => {
    setPhases((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const client = clients.find((c) => c.id === clientId);
    const projectRow = {
      name: projectName,
      client_id: clientId || null,
      client_name: client?.name || null,
      description,
      status,
      budget: parseFloat(budget) || 0,
      start_date: startDate || null,
      deadline: deadline || null,
      contract_type: contractType || null,
      team: selectedTeam,
      phases,
      progress: 0,
    };
    try {
      await projectService.create(projectRow);
      navigate('/projects');
    } catch (err) {
      setSubmitError(err.message || 'Failed to create project.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button
            onClick={() => navigate('/projects')}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, padding: 0, marginBottom: '0.5rem' }}
          >
            <ArrowLeft size={16} /> Back to Projects
          </button>
          <h1 className="page-title">New Project</h1>
        </div>
      </div>

      {/* Form Card */}
      <div className="card" style={{ padding: '2rem', maxWidth: '950px' }}>
        {/* Project Name & Client */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={labelStyle}>Project Name</label>
            <input
              className="input"
              type="text"
              placeholder="Enter project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Client</label>
            <select
              className="input"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.company}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Description</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Brief project description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Status & Budget */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={labelStyle}>Status</label>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Planning">Planning</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Budget ($)</label>
            <input
              className="input"
              type="number"
              placeholder="0.00"
              min="0"
              step="1000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
        </div>

        {/* Start Date & Deadline */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={labelStyle}>Start Date</label>
            <input
              className="input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Deadline</label>
            <input
              className="input"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        {/* Contract Type */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>Contract Type</label>
          <select
            className="input"
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
            style={{ maxWidth: 'calc(50% - 0.75rem)' }}
          >
            <option value="">Select contract type</option>
            <option value="New Construction">New Construction</option>
            <option value="Renovation">Renovation</option>
            <option value="Interior Build-Out">Interior Build-Out</option>
            <option value="Exterior">Exterior</option>
            <option value="General Construction">General Construction</option>
          </select>
        </div>

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 0 1.5rem 0' }} />

        {/* Team Members */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Users size={18} style={{ color: '#64748b' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Team Members</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {teamMembers.map((member) => (
              <label
                key={member.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: selectedTeam.includes(member.name) ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                  background: selectedTeam.includes(member.name) ? '#eff6ff' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedTeam.includes(member.name)}
                  onChange={() => toggleTeamMember(member.name)}
                  style={{ accentColor: '#3b82f6', width: '1rem', height: '1rem' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{member.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{member.role}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 0 1.5rem 0' }} />

        {/* Project Phases */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Layers size={18} style={{ color: '#64748b' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Project Phases</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {phases.map((phase, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', minWidth: '1.5rem' }}>{index + 1}.</span>
                <input
                  className="input"
                  type="text"
                  value={phase}
                  onChange={(e) => updatePhase(index, e.target.value)}
                  placeholder="Phase name"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => removePhase(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Remove phase"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addPhase}
            style={{
              marginTop: '0.75rem',
              background: 'none',
              border: '1px dashed #cbd5e1',
              borderRadius: '0.5rem',
              padding: '0.5rem 1rem',
              color: '#3b82f6',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            <Plus size={14} /> Add Phase
          </button>
        </div>

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 0 1.5rem 0' }} />

        {/* Actions */}
        {submitError && (
          <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.875rem' }}>
            {submitError}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          <button className="btn-secondary" onClick={() => navigate('/projects')} disabled={submitting}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={submitting}>
            {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />} Save Project
          </button>
        </div>
      </div>
    </div>
  );
}
