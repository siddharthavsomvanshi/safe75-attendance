import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Panel } from '../components/UI';
import {
  LogOut,
  Upload,
  Check,
  X,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
  Copy,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  MessageSquareWarning,
  FileText,
} from '../components/Icons';

interface ExamResource {
  id: string;
  subject: string;
  type: string;
  title: string;
  file_url: string;
  year?: number | null;
  status: string;
  created_at: string;
}

interface FeedbackReport {
  id: string;
  issue_type: string;
  title?: string | null;
  message: string;
  user_email?: string | null;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  admin_notes?: string | null;
  diagnostics?: any;
  device_info?: any;
  created_at: string;
  updated_at?: string;
}

const CATEGORY_LABELS: Record<string, { label: string; badgeClass: string }> = {
  attendance_mismatch: { label: '🔢 Calculation Discrepancy', badgeClass: 'status-badge--danger' },
  component_missing: { label: '📑 Missing Component', badgeClass: 'status-badge--warning' },
  timetable_desync: { label: '📅 Timetable Desync', badgeClass: 'status-badge--info' },
  proxy_login: { label: '🔑 Proxy / Login Failure', badgeClass: 'status-badge--danger' },
  app_malfunction: { label: '⚠️ App Malfunction', badgeClass: 'status-badge--warning' },
  feature_request: { label: '💡 Feature Request', badgeClass: 'status-badge--neutral' },
  other: { label: '❓ Other Inquiry', badgeClass: 'status-badge--neutral' },
};

const STATUS_CONFIG: Record<
  FeedbackReport['status'],
  { label: string; bg: string; color: string; border: string }
> = {
  open: { label: 'Open', bg: 'var(--warning-soft)', color: 'var(--warning)', border: 'var(--warning-border)' },
  investigating: { label: 'Investigating', bg: 'var(--info-soft)', color: 'var(--info)', border: 'var(--info-border)' },
  resolved: { label: 'Resolved', bg: 'var(--success-soft)', color: 'var(--success)', border: 'var(--success-border)' },
  closed: { label: 'Closed', bg: 'var(--bg-section)', color: 'var(--text-muted)', border: 'var(--border)' },
};

export function AdminPanel() {
  const navigate = useNavigate();
  const [loadingSession, setLoadingSession] = useState(true);
  const [adminTab, setAdminTab] = useState<'resources' | 'snitch'>('snitch');

  // ==========================================
  // Exam Resources State
  // ==========================================
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('notes');
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  const [resourceActiveTab, setResourceActiveTab] = useState<'pending' | 'approved'>('pending');

  const [uploading, setUploading] = useState(false);
  const [resources, setResources] = useState<ExamResource[]>([]);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [resourceSuccess, setResourceSuccess] = useState<string | null>(null);

  // ==========================================
  // Snitch / Feedback Reports State
  // ==========================================
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'investigating' | 'resolved' | 'closed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDiagnostics, setExpandedDiagnostics] = useState<Record<string, boolean>>({});
  const [adminNotesMap, setAdminNotesMap] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
    fetchResources();
    fetchReports();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin-login');
    } else {
      setLoadingSession(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin-login');
  };

  // ------------------------------------------
  // Resources Handlers
  // ------------------------------------------
  const fetchResources = async () => {
    const { data, error } = await supabase
      .from('exam_resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setResources(data);
    if (error) console.error('Error fetching resources:', error);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !title || !type) {
      setResourceError('Please fill all required fields');
      return;
    }
    if (uploadMode === 'file' && !file) {
      setResourceError('Please select a file');
      return;
    }
    if (uploadMode === 'link' && !externalUrl) {
      setResourceError('Please provide a URL');
      return;
    }

    setUploading(true);
    setResourceError(null);
    setResourceSuccess(null);

    try {
      let finalUrl = externalUrl;

      if (uploadMode === 'file' && file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `files/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('exam-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('exam-files').getPublicUrl(filePath);
        finalUrl = data.publicUrl;
      }

      const { error: dbError } = await supabase.from('exam_resources').insert({
        subject: subject.toUpperCase().trim(),
        type,
        title: title.trim(),
        file_url: finalUrl,
        year: year ? parseInt(year) : null,
        status: 'approved',
      });

      if (dbError) throw dbError;

      setResourceSuccess('Resource added successfully.');
      setTitle('');
      setFile(null);
      setExternalUrl('');
      setYear('');
      fetchResources();
    } catch (err: any) {
      setResourceError(err.message || "Couldn't add the resource.");
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async (resource: ExamResource) => {
    try {
      const { error } = await supabase.from('exam_resources').update({ status: 'approved' }).eq('id', resource.id);
      if (error) throw error;
      setResources(resources.map((r) => (r.id === resource.id ? { ...r, status: 'approved' } : r)));
    } catch (err: any) {
      alert(`Error approving: ${err.message}`);
    }
  };

  const handleDeleteResource = async (resource: ExamResource) => {
    if (!window.confirm(`Delete ${resource.title}?`)) return;

    try {
      if (resource.file_url.includes('supabase.co/storage')) {
        const urlParts = resource.file_url.split('/exam-files/');
        if (urlParts.length > 1) {
          const path = urlParts[1];
          await supabase.storage.from('exam-files').remove([path]);
        }
      }

      const { error } = await supabase.from('exam_resources').delete().eq('id', resource.id);
      if (error) throw error;

      setResources(resources.filter((r) => r.id !== resource.id));
    } catch (err: any) {
      alert(`Error deleting: ${err.message}`);
    }
  };

  // ------------------------------------------
  // Snitch / Feedback Reports Handlers
  // ------------------------------------------
  const fetchReports = async () => {
    setLoadingReports(true);
    setReportsError(null);
    try {
      const { data, error } = await supabase
        .from('feedback_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet if migration hasn't been run
        if (error.code === '42P01') {
          setReportsError(
            'The "feedback_reports" table is not found in Supabase yet. Please execute the migration file (api/notifications/migrations/create_feedback_reports.sql) in your Supabase SQL Editor.'
          );
        } else {
          setReportsError(error.message);
        }
      } else if (data) {
        setReports(data);
        // Initialize admin notes
        const notes: Record<string, string> = {};
        data.forEach((r: FeedbackReport) => {
          notes[r.id] = r.admin_notes || '';
        });
        setAdminNotesMap(notes);
      }
    } catch (err: any) {
      setReportsError(err.message || 'Failed to fetch feedback reports');
    } finally {
      setLoadingReports(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, newStatus: FeedbackReport['status']) => {
    setUpdatingStatusId(reportId);
    try {
      const { error } = await supabase
        .from('feedback_reports')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', reportId);

      if (error) throw error;

      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus, updated_at: new Date().toISOString() } : r))
      );
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleSaveAdminNote = async (reportId: string) => {
    const noteText = adminNotesMap[reportId] || '';
    try {
      const { error } = await supabase
        .from('feedback_reports')
        .update({ admin_notes: noteText.trim(), updated_at: new Date().toISOString() })
        .eq('id', reportId);

      if (error) throw error;

      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, admin_notes: noteText.trim() } : r))
      );
      alert('Admin note saved.');
    } catch (err: any) {
      alert(`Failed to save note: ${err.message}`);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this report?')) return;

    try {
      const { error } = await supabase.from('feedback_reports').delete().eq('id', reportId);
      if (error) throw error;

      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err: any) {
      alert(`Failed to delete report: ${err.message}`);
    }
  };

  const handleCopyDiagnostics = (reportId: string, diagnostics: any) => {
    if (!diagnostics) return;
    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    setCopiedId(reportId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }
      // Category filter
      if (categoryFilter !== 'all' && r.issue_type !== categoryFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const msgMatch = r.message.toLowerCase().includes(query);
        const titleMatch = (r.title || '').toLowerCase().includes(query);
        const emailMatch = (r.user_email || '').toLowerCase().includes(query);
        const idMatch = r.id.toLowerCase().includes(query);
        const branchMatch = (r.diagnostics?.studentMetadata?.branch || '').toLowerCase().includes(query);
        const rollMatch = (r.diagnostics?.studentMetadata?.rollNumber || '').toLowerCase().includes(query);
        return msgMatch || titleMatch || emailMatch || idMatch || branchMatch || rollMatch;
      }
      return true;
    });
  }, [reports, statusFilter, categoryFilter, searchQuery]);

  // Counts
  const openReportsCount = useMemo(() => reports.filter((r) => r.status === 'open').length, [reports]);
  const investigatingCount = useMemo(() => reports.filter((r) => r.status === 'investigating').length, [reports]);
  const resolvedCount = useMemo(() => reports.filter((r) => r.status === 'resolved').length, [reports]);

  if (loadingSession) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading admin command center...
      </div>
    );
  }

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    outline: 'none',
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* Header with Title and Tab Switcher */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Admin Command Center
          </h1>
          <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Manage student attendance discrepancy tickets, diagnostics, and exam resources.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="action-button action-button--secondary"
          style={{ padding: '6px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <LogOut size={13} />
          <span>Logout</span>
        </button>
      </div>

      {/* Top Level Nav Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setAdminTab('snitch')}
          className={`filter-tab ${adminTab === 'snitch' ? 'active' : ''}`}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <MessageSquareWarning size={15} />
          <span>Snitch Ticket Hub</span>
          {openReportsCount > 0 && (
            <span
              style={{
                background: 'var(--warning)',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '10px',
              }}
            >
              {openReportsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('resources')}
          className={`filter-tab ${adminTab === 'resources' ? 'active' : ''}`}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <FileText size={15} />
          <span>Exam Resources</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({resources.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SNITCH / BUG & DISCREPANCY TICKET HUB                              */}
      {/* ========================================================================= */}
      {adminTab === 'snitch' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* KPI Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
            }}
          >
            <div
              className="standard-card"
              style={{ padding: '14px 16px', borderLeft: '4px solid var(--warning)' }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Open Tickets</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--warning)', marginTop: 4 }}>
                {openReportsCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Awaiting review</div>
            </div>

            <div
              className="standard-card"
              style={{ padding: '14px 16px', borderLeft: '4px solid var(--info)' }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Under Investigation</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--info)', marginTop: 4 }}>
                {investigatingCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Actively being resolved</div>
            </div>

            <div
              className="standard-card"
              style={{ padding: '14px 16px', borderLeft: '4px solid var(--success)' }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Resolved</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>
                {resolvedCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Fixed or answered</div>
            </div>

            <div
              className="standard-card"
              style={{ padding: '14px 16px', borderLeft: '4px solid var(--primary-border)' }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Total Tickets</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                {reports.length}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>All time reports</div>
            </div>
          </div>

          {/* Error Banner if Supabase table is missing */}
          {reportsError && (
            <div
              className="notice-banner"
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                background: 'var(--danger-soft)',
                color: 'var(--danger)',
                border: '1px solid var(--danger-border)',
                display: 'grid',
                gap: 6,
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <AlertTriangle size={16} />
                <span>Database Table Setup Required</span>
              </div>
              <p style={{ margin: 0, lineHeight: 1.5 }}>{reportsError}</p>
            </div>
          )}

          {/* Filters & Search Controls */}
          <Panel title="Ticket Stream" subtitle={`Viewing ${filteredReports.length} of ${reports.length} reports.`}>
            <div style={{ display: 'grid', gap: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                {/* Status Tabs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(['all', 'open', 'investigating', 'resolved', 'closed'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`filter-tab ${statusFilter === st ? 'active' : ''}`}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        textTransform: 'capitalize',
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {/* Refresh Button */}
                <button
                  type="button"
                  onClick={fetchReports}
                  disabled={loadingReports}
                  className="action-button action-button--secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  title="Refresh reports"
                >
                  <RefreshCw size={13} className={loadingReports ? 'spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Secondary Filters: Category + Search Input */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={inputStyle}
                  className="standard-input"
                >
                  <option value="all">All Categories</option>
                  <option value="attendance_mismatch">🔢 Calculation Discrepancy</option>
                  <option value="component_missing">📑 Missing Component</option>
                  <option value="timetable_desync">📅 Timetable Desync</option>
                  <option value="proxy_login">🔑 Proxy / Login Failure</option>
                  <option value="app_malfunction">⚠️ App Malfunction</option>
                  <option value="feature_request">💡 Feature Request</option>
                  <option value="other">❓ Other Inquiry</option>
                </select>

                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search by ticket ID, message, email, branch..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: '32px' }}
                    className="standard-input"
                  />
                  <Search
                    size={14}
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>

              {/* Tickets List */}
              <div style={{ display: 'grid', gap: '12px', marginTop: 4 }}>
                {filteredReports.map((report) => {
                  const catInfo = CATEGORY_LABELS[report.issue_type] || {
                    label: report.issue_type,
                    badgeClass: 'status-badge--neutral',
                  };
                  const statusConf = STATUS_CONFIG[report.status] || STATUS_CONFIG.open;
                  const isDiagExpanded = Boolean(expandedDiagnostics[report.id]);
                  const diag = report.diagnostics;

                  return (
                    <div
                      key={report.id}
                      className="standard-card rise-in"
                      style={{
                        padding: '16px 18px',
                        display: 'grid',
                        gap: '12px',
                        borderRadius: 10,
                        borderLeft: `4px solid ${statusConf.color}`,
                      }}
                    >
                      {/* Ticket Header */}
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                          {/* Issue Category Pill */}
                          <span
                            className={`status-badge ${catInfo.badgeClass}`}
                            style={{ padding: '3px 10px', borderRadius: 6, fontSize: '12px', fontWeight: 600 }}
                          >
                            {catInfo.label}
                          </span>

                          {/* Ticket ID */}
                          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            #{report.id.substring(0, 8).toUpperCase()}
                          </span>

                          {/* Priority badge if high/critical */}
                          {report.priority === 'high' || report.priority === 'critical' ? (
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'var(--danger-soft)',
                                color: 'var(--danger)',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                              }}
                            >
                              {report.priority}
                            </span>
                          ) : null}
                        </div>

                        {/* Status Selector + Timestamp */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {new Date(report.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>

                          <select
                            value={report.status}
                            disabled={updatingStatusId === report.id}
                            onChange={(e) =>
                              handleUpdateStatus(report.id, e.target.value as FeedbackReport['status'])
                            }
                            style={{
                              padding: '4px 8px',
                              borderRadius: 6,
                              fontSize: '12px',
                              fontWeight: 700,
                              background: statusConf.bg,
                              color: statusConf.color,
                              border: `1px solid ${statusConf.border}`,
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            <option value="open">Open</option>
                            <option value="investigating">Investigating</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                      </div>

                      {/* Ticket Title & Body */}
                      <div>
                        {report.title && (
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                            {report.title}
                          </div>
                        )}
                        <p
                          style={{
                            margin: 0,
                            fontSize: '13px',
                            lineHeight: 1.6,
                            color: 'var(--text-secondary)',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {report.message}
                        </p>
                      </div>

                      {/* Contact Info & Device Metadata */}
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: 12,
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          paddingTop: 4,
                        }}
                      >
                        {report.user_email ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>Student:</span>
                            <a
                              href={`mailto:${report.user_email}?subject=Safe75 Issue %23${report.id.substring(0, 8)}`}
                              style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
                            >
                              {report.user_email}
                            </a>
                          </div>
                        ) : (
                          <span>Submitted anonymously</span>
                        )}

                        {diag?.studentMetadata?.branch && (
                          <span className="status-badge status-badge--neutral" style={{ padding: '1px 6px', borderRadius: 4 }}>
                            {diag.studentMetadata.branch} • Sem {diag.studentMetadata.semester || '?'}
                          </span>
                        )}

                        {diag?.studentMetadata?.rollNumber && (
                          <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                            Roll: {diag.studentMetadata.rollNumber}
                          </span>
                        )}

                        {report.device_info?.isPwa && (
                          <span className="status-badge status-badge--info" style={{ padding: '1px 6px', borderRadius: 4 }}>
                            PWA Installed
                          </span>
                        )}
                      </div>

                      {/* Diagnostics Accordion */}
                      {diag && (
                        <div
                          style={{
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'var(--bg-section)',
                            padding: '10px 14px',
                            display: 'grid',
                            gap: 8,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedDiagnostics((prev) => ({ ...prev, [report.id]: !prev[report.id] }))
                              }
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--accent)',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: 0,
                              }}
                            >
                              {isDiagExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              <span>
                                {isDiagExpanded ? 'Hide Diagnostics Data' : 'Inspect Diagnostics & Course Snapshot'}
                              </span>
                            </button>

                            {isDiagExpanded && (
                              <button
                                type="button"
                                onClick={() => handleCopyDiagnostics(report.id, diag)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                {copiedId === report.id ? <CheckCheck size={12} color="var(--success)" /> : <Copy size={12} />}
                                <span>{copiedId === report.id ? 'Copied' : 'Copy JSON'}</span>
                              </button>
                            )}
                          </div>

                          {isDiagExpanded && (
                            <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                              {/* Quick summary table of courses */}
                              {diag.studentMetadata?.courses && diag.studentMetadata.courses.length > 0 && (
                                <div style={{ overflowX: 'auto', maxHeight: 200 }}>
                                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '4px 6px' }}>Code</th>
                                        <th style={{ padding: '4px 6px' }}>Course</th>
                                        <th style={{ padding: '4px 6px' }}>Component</th>
                                        <th style={{ padding: '4px 6px' }}>Attended / Total</th>
                                        <th style={{ padding: '4px 6px' }}>%</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {diag.studentMetadata.courses.flatMap((c: any) =>
                                        c.components?.map((comp: any, idx: number) => (
                                          <tr key={`${c.code}-${idx}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                            <td style={{ padding: '4px 6px', fontWeight: 600 }}>{c.code}</td>
                                            <td style={{ padding: '4px 6px', color: 'var(--text-secondary)' }}>{c.name}</td>
                                            <td style={{ padding: '4px 6px' }}>{comp.component}</td>
                                            <td style={{ padding: '4px 6px' }}>
                                              {comp.present} / {comp.total}
                                              {comp.extra > 0 ? ` (+${comp.extra})` : ''}
                                            </td>
                                            <td style={{ padding: '4px 6px', fontWeight: 600 }}>{comp.pct ?? 'N/A'}%</td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              <pre
                                style={{
                                  margin: 0,
                                  padding: 8,
                                  background: 'var(--bg-card)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 6,
                                  fontSize: '11px',
                                  fontFamily: 'monospace',
                                  color: 'var(--text-secondary)',
                                  maxHeight: 160,
                                  overflowY: 'auto',
                                }}
                              >
                                {JSON.stringify(diag, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Admin Notes & Resolution Section */}
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                          alignItems: 'center',
                          paddingTop: 8,
                          borderTop: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 240 }}>
                          <input
                            type="text"
                            placeholder="Add internal resolution note (e.g. Fixed in patch v2.4, student emailed)..."
                            value={adminNotesMap[report.id] || ''}
                            onChange={(e) =>
                              setAdminNotesMap({ ...adminNotesMap, [report.id]: e.target.value })
                            }
                            style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px' }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveAdminNote(report.id)}
                          className="action-button action-button--secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          Save Note
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteReport(report.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--danger)',
                            fontSize: '12px',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            fontWeight: 600,
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredReports.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      padding: '36px 16px',
                      background: 'var(--bg-section)',
                      borderRadius: 8,
                    }}
                  >
                    No feedback reports match the current filters.
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EXAM RESOURCES MANAGER (Existing Feature Preserved & Polished)       */}
      {/* ========================================================================= */}
      {adminTab === 'resources' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <Panel title="Add Resource" subtitle="Upload notes, PYQs, or links for students.">
            <form onSubmit={handleUpload} className="standard-card" style={{ display: 'grid', gap: '16px' }}>
              {resourceError && (
                <div
                  className="notice-banner"
                  style={{ padding: '10px', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: '8px' }}
                >
                  {resourceError}
                </div>
              )}
              {resourceSuccess && (
                <div
                  className="notice-banner"
                  style={{ padding: '10px', background: 'var(--success-soft)', color: 'var(--success)', borderRadius: '8px' }}
                >
                  {resourceSuccess}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>Subject</label>
                  <input
                    className="standard-input"
                    type="text"
                    placeholder="e.g. LAE, CO, DBMS"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>Type</label>
                  <select
                    className="standard-input"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="notes">Notes</option>
                    <option value="pyq">PYQ</option>
                    <option value="important">Important Topics</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>Title</label>
                  <input
                    className="standard-input"
                    type="text"
                    placeholder="e.g. Unit 1 Handwritten Notes"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>
                {type === 'pyq' && (
                  <div style={{ display: 'grid', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700 }}>Year (optional)</label>
                    <input
                      className="standard-input"
                      type="number"
                      placeholder="2023"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '16px', padding: '6px 0' }}>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="radio"
                    name="uploadMode"
                    checked={uploadMode === 'file'}
                    onChange={() => setUploadMode('file')}
                  />{' '}
                  Upload file
                </label>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="radio"
                    name="uploadMode"
                    checked={uploadMode === 'link'}
                    onChange={() => setUploadMode('link')}
                  />{' '}
                  Add link
                </label>
              </div>

              {uploadMode === 'file' ? (
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>File</label>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    style={inputStyle}
                    accept=".pdf,.doc,.docx,.jpg,.png"
                  />
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>Resource link</label>
                  <input
                    className="standard-input"
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="action-button action-button--primary"
                style={{ justifySelf: 'start', padding: '10px 24px', opacity: uploading ? 0.7 : 1 }}
              >
                {uploading ? 'Uploading...' : 'Publish'}
              </button>
            </form>
          </Panel>

          <Panel title="Manage Resources" subtitle={`${resources.length} total resources.`}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setResourceActiveTab('pending')}
                className={`filter-tab ${resourceActiveTab === 'pending' ? 'active' : ''}`}
                style={{ padding: '8px 16px' }}
              >
                Pending ({resources.filter((r) => r.status === 'pending').length})
              </button>
              <button
                type="button"
                onClick={() => setResourceActiveTab('approved')}
                className={`filter-tab ${resourceActiveTab === 'approved' ? 'active' : ''}`}
                style={{ padding: '8px 16px' }}
              >
                Live ({resources.filter((r) => r.status === 'approved').length})
              </button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {resources
                .filter((r) => r.status === resourceActiveTab)
                .map((res) => (
                  <div
                    key={res.id}
                    className="standard-card interactive-row"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 16px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{res.title}</div>
                      <div
                        style={{
                          fontSize: '13px',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          gap: '8px',
                          marginTop: '4px',
                        }}
                      >
                        <span className="status-badge status-badge--neutral" style={{ padding: '2px 8px', borderRadius: '4px' }}>
                          {res.subject}
                        </span>
                        <span
                          className="status-badge status-badge--info"
                          style={{ padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}
                        >
                          {res.type}
                        </span>
                        {res.year && <span style={{ color: 'var(--text-secondary)' }}>Year {res.year}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <a
                        href={res.file_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', padding: '6px 10px', fontWeight: 600 }}
                      >
                        View
                      </a>
                      {res.status === 'pending' && (
                        <button
                          type="button"
                          className="status-badge status-badge--success"
                          onClick={() => handleApprove(res)}
                          style={{ border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Approve
                        </button>
                      )}
                      <button
                        type="button"
                        className="status-badge status-badge--danger"
                        onClick={() => handleDeleteResource(res)}
                        style={{ border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

              {resources.filter((r) => r.status === resourceActiveTab).length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                  No resources in this list yet.
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
