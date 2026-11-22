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
  Calendar,
  Plus,
  ShieldCheck,
} from '../components/Icons';
import type { SystemHealthData } from '../components/ERPStatusIndicator';
import { formatIsoDate } from '../utils/date';
import {
  fetchAllAcademicEventsAdmin,
  createAcademicEvent,
  updateAcademicEvent,
  deleteAcademicEvent,
  type AcademicEvent,
  type AcademicEventType,
  type MirrorDay,
} from '../services/academicEvents';

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
  const [adminTab, setAdminTab] = useState<'resources' | 'snitch' | 'events' | 'health'>('snitch');

  // ==========================================
  // System Health & Proxy Monitor State
  // ==========================================
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [testingHealth, setTestingHealth] = useState(false);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);

  // ==========================================
  // Academic Events & Off-Days State
  // ==========================================
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsSuccess, setEventsSuccess] = useState<string | null>(null);

  // New Event Form State
  const [evTitle, setEvTitle] = useState('');
  const [evType, setEvType] = useState<AcademicEventType>('holiday');
  const [evStartDate, setEvStartDate] = useState(() => formatIsoDate(new Date()));
  const [evEndDate, setEvEndDate] = useState(() => formatIsoDate(new Date()));
  const [evBranches, setEvBranches] = useState<string[]>(['ALL']);
  const [evSemesters, setEvSemesters] = useState<string[]>(['ALL']);
  const [evMirrorDay, setEvMirrorDay] = useState<MirrorDay>('MONDAY');
  const [evNotes, setEvNotes] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null);

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
    fetchEvents();
    runHealthPing();
  }, []);

  const fetchEvents = async () => {
    setLoadingEvents(true);
    setEventsError(null);
    try {
      const data = await fetchAllAcademicEventsAdmin();
      setEvents(data);
    } catch (err: any) {
      if (err.code === '42P01') {
        setEventsError(
          'The "academic_events" table is not found in Supabase yet. Please execute api/notifications/migrations/create_academic_events.sql in your Supabase SQL Editor.'
        );
      } else {
        setEventsError(err.message || 'Failed to fetch academic events');
      }
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) {
      setEventsError('Event title is required');
      return;
    }

    setIsCreatingEvent(true);
    setEventsError(null);
    setEventsSuccess(null);

    try {
      const isOffDay = evType === 'holiday';
      const mirrorDay = evType === 'holiday' ? null : evMirrorDay;

      await createAcademicEvent({
        title: evTitle.trim(),
        event_type: evType,
        start_date: evStartDate,
        end_date: evEndDate,
        is_off_day: isOffDay,
        affected_branches: evBranches.length === 0 ? ['ALL'] : evBranches,
        affected_semesters: evSemesters.length === 0 ? ['ALL'] : evSemesters,
        mirror_day: mirrorDay,
        notes: evNotes.trim() || null,
        is_active: true,
      });

      setEventsSuccess(`Event "${evTitle.trim()}" published successfully.`);
      setEvTitle('');
      setEvNotes('');
      setEvType('holiday');
      setEvBranches(['ALL']);
      setEvSemesters(['ALL']);
      await fetchEvents();
      setTimeout(() => setEventsSuccess(null), 4000);
    } catch (err: any) {
      setEventsError(err.message || 'Failed to create academic event');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleToggleEventActive = async (event: AcademicEvent) => {
    setTogglingEventId(event.id);
    try {
      await updateAcademicEvent(event.id, { is_active: !event.is_active });
      setEvents((prev) =>
        prev.map((ev) => (ev.id === event.id ? { ...ev, is_active: !ev.is_active } : ev))
      );
    } catch (err: any) {
      setEventsError(err.message || 'Failed to update event status');
    } finally {
      setTogglingEventId(null);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }
    setDeletingEventId(id);
    try {
      await deleteAcademicEvent(id);
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
      setEventsSuccess('Event deleted successfully.');
      setTimeout(() => setEventsSuccess(null), 3000);
    } catch (err: any) {
      setEventsError(err.message || 'Failed to delete event');
    } finally {
      setDeletingEventId(null);
    }
  };

  const toggleBranchSelection = (branch: string) => {
    if (branch === 'ALL') {
      setEvBranches(['ALL']);
      return;
    }
    setEvBranches((prev) => {
      const withoutAll = prev.filter((b) => b !== 'ALL');
      if (withoutAll.includes(branch)) {
        const next = withoutAll.filter((b) => b !== branch);
        return next.length === 0 ? ['ALL'] : next;
      } else {
        return [...withoutAll, branch];
      }
    });
  };

  const toggleSemesterSelection = (sem: string) => {
    if (sem === 'ALL') {
      setEvSemesters(['ALL']);
      return;
    }
    setEvSemesters((prev) => {
      const withoutAll = prev.filter((s) => s !== 'ALL');
      if (withoutAll.includes(sem)) {
        const next = withoutAll.filter((s) => s !== sem);
        return next.length === 0 ? ['ALL'] : next;
      } else {
        return [...withoutAll, sem];
      }
    });
  };

  const runHealthPing = async (fresh = false) => {
    setTestingHealth(true);
    try {
      const res = await fetch(`/api/health${fresh ? '?fresh=1' : ''}`);
      if (res.ok) {
        const data = (await res.json()) as SystemHealthData;
        setHealthData(data);
      }
    } catch (err: any) {
      console.warn('Could not run health ping:', err);
    } finally {
      setTestingHealth(false);
    }
  };

  const fetchIncidents = async () => {
    setLoadingIncidents(true);
    try {
      const { data, error } = await supabase
        .from('system_incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data) {
        setIncidents(data);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingIncidents(false);
    }
  };

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

        <button
          type="button"
          onClick={() => setAdminTab('events')}
          className={`filter-tab ${adminTab === 'events' ? 'active' : ''}`}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <Calendar size={15} />
          <span>Academic Events & Off-Days</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({events.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAdminTab('health');
            runHealthPing(true);
            fetchIncidents();
          }}
          className={`filter-tab ${adminTab === 'health' ? 'active' : ''}`}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <ShieldCheck size={15} />
          <span>System & ERP Health</span>
          {healthData && (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor:
                  healthData.status === 'operational'
                    ? 'var(--success)'
                    : healthData.status === 'degraded'
                    ? 'var(--warning)'
                    : 'var(--danger)',
                display: 'inline-block',
                boxShadow: `0 0 6px ${
                  healthData.status === 'operational'
                    ? 'var(--success)'
                    : healthData.status === 'degraded'
                    ? 'var(--warning)'
                    : 'var(--danger)'
                }`,
              }}
            />
          )}
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

      {/* ========================================================================= */}
      {/* TAB 3: ACADEMIC EVENTS, OFF-DAYS & WORKING SATURDAYS                      */}
      {/* ========================================================================= */}
      {adminTab === 'events' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* KPI Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            <div className="standard-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Events
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)' }}>
                {events.length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                All configured academic events
              </div>
            </div>

            <div className="standard-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--warning)', textTransform: 'uppercase' }}>
                Off-Days & Hackathons
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: 'var(--warning)' }}>
                {events.filter((e) => e.is_off_day).length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                College or branch-specific off-days
              </div>
            </div>

            <div className="standard-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--info)', textTransform: 'uppercase' }}>
                Working Saturdays & Swaps
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: 'var(--info)' }}>
                {events.filter((e) => !e.is_off_day).length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Compensatory classes & day-swaps
              </div>
            </div>

            <div className="standard-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--success)', textTransform: 'uppercase' }}>
                Active in App
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: 'var(--success)' }}>
                {events.filter((e) => e.is_active).length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Currently affecting student schedules
              </div>
            </div>
          </div>

          {eventsError && (
            <div
              className="notice-banner"
              style={{
                padding: '12px 16px',
                background: 'var(--danger-soft)',
                border: '1px solid var(--danger-border)',
                borderRadius: '8px',
                color: 'var(--danger)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <AlertTriangle size={16} />
              <div>
                <strong>Action Needed:</strong> {eventsError}
              </div>
            </div>
          )}

          {eventsSuccess && (
            <div
              className="notice-banner"
              style={{
                padding: '12px 16px',
                background: 'var(--success-soft)',
                border: '1px solid var(--success-border)',
                borderRadius: '8px',
                color: 'var(--success)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <CheckCircle2 size={16} />
              <div>{eventsSuccess}</div>
            </div>
          )}

          {/* Form: Add Academic Event */}
          <Panel
            title="Publish Academic Event / Timetable Override"
            subtitle="Broadcast college-wide or branch-specific off-days, working Saturdays, and day-swaps directly to all students."
          >
            <form onSubmit={handleCreateEvent} className="standard-card" style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Event Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI & AIML Hackathon Off-Day, Guru Nanak Jayanti, or Compensatory Saturday"
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Event Type *
                  </label>
                  <select
                    value={evType}
                    onChange={(e) => setEvType(e.target.value as AcademicEventType)}
                    className="input-field"
                  >
                    <option value="holiday">🏖️ Off-Day / Hackathon (No Classes)</option>
                    <option value="working_day">📅 Working Saturday (Compensatory Classes)</option>
                    <option value="day_swap">🔄 Timetable Day-Swap (Follows Another Day)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={evStartDate}
                    onChange={(e) => {
                      setEvStartDate(e.target.value);
                      if (e.target.value > evEndDate) setEvEndDate(e.target.value);
                    }}
                    className="input-field"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={evEndDate}
                    onChange={(e) => setEvEndDate(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                {evType !== 'holiday' && (
                  <div style={{ display: 'grid', gap: '6px' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Mirror Timetable Day *
                    </label>
                    <select
                      value={evMirrorDay}
                      onChange={(e) => setEvMirrorDay(e.target.value as MirrorDay)}
                      className="input-field"
                    >
                      <option value="MONDAY">Monday's Schedule</option>
                      <option value="TUESDAY">Tuesday's Schedule</option>
                      <option value="WEDNESDAY">Wednesday's Schedule</option>
                      <option value="THURSDAY">Thursday's Schedule</option>
                      <option value="FRIDAY">Friday's Schedule</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Target Branches Selector */}
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Affected Branches
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {evBranches.includes('ALL') ? 'Applies to everyone' : `Selected (${evBranches.length})`}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['ALL', 'CSE', 'CSEAIML', 'CSEDS', 'CSECS', 'IT', 'CSIT', 'ECE', 'ECEVLSI', 'EEE', 'ELCE', 'ME', 'MCA', 'MBA'].map((b) => {
                    const isSelected = evBranches.includes(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => toggleBranchSelection(b)}
                        className={`filter-tab ${isSelected ? 'active' : ''}`}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                        }}
                      >
                        {b === 'ALL' ? '🌐 All Branches' : b}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Semesters Selector */}
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Affected Semesters
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {evSemesters.includes('ALL') ? 'All Semesters' : `Selected (${evSemesters.length})`}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['ALL', '1', '3', '5', '7'].map((s) => {
                    const isSelected = evSemesters.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSemesterSelection(s)}
                        className={`filter-tab ${isSelected ? 'active' : ''}`}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                        }}
                      >
                        {s === 'ALL' ? '🎓 All Semesters' : `Sem ${s}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Internal Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dean Academics Notice dated Nov 21"
                  value={evNotes}
                  onChange={(e) => setEvNotes(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="submit"
                  disabled={isCreatingEvent}
                  className="action-button action-button--primary"
                  style={{ padding: '8px 20px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={15} />
                  <span>{isCreatingEvent ? 'Publishing...' : 'Publish Academic Event'}</span>
                </button>
              </div>
            </form>
          </Panel>

          {/* Events Stream */}
          <Panel
            title="Active & Upcoming Academic Events"
            subtitle="Events configured here dynamically update the class schedule, attendance forecasts, and bunk planner for targeted students."
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button
                type="button"
                onClick={fetchEvents}
                disabled={loadingEvents}
                className="action-button action-button--secondary"
                style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={13} className={loadingEvents ? 'spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="standard-card"
                  style={{
                    padding: '16px',
                    display: 'grid',
                    gap: 10,
                    opacity: ev.is_active ? 1 : 0.6,
                    borderLeft: `4px solid ${ev.is_off_day ? 'var(--warning)' : 'var(--info)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {ev.title}
                        </span>
                        <span
                          className={`status-badge ${ev.is_off_day ? 'status-badge--warning' : 'status-badge--info'}`}
                          style={{ fontSize: '11px', padding: '2px 8px' }}
                        >
                          {ev.is_off_day ? '🏖️ Off-Day' : '📅 Working Day'}
                        </span>
                        {ev.mirror_day && (
                          <span className="status-badge status-badge--neutral" style={{ fontSize: '11px', padding: '2px 8px' }}>
                            🔄 Follows {ev.mirror_day} Schedule
                          </span>
                        )}
                        <span
                          className={`status-badge ${ev.is_active ? 'status-badge--success' : 'status-badge--neutral'}`}
                          style={{ fontSize: '10.5px', padding: '1px 6px' }}
                        >
                          {ev.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <strong>Date:</strong> {ev.start_date === ev.end_date ? ev.start_date : `${ev.start_date} to ${ev.end_date}`}
                        {ev.notes && <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>• {ev.notes}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleToggleEventActive(ev)}
                        disabled={togglingEventId === ev.id}
                        className={`status-badge ${ev.is_active ? 'status-badge--warning' : 'status-badge--success'}`}
                        style={{ border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '11.5px' }}
                      >
                        {ev.is_active ? 'Pause' : 'Activate'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev.id)}
                        disabled={deletingEventId === ev.id}
                        className="status-badge status-badge--danger"
                        style={{ border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '11.5px' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Branches:</span>
                    <span className="status-badge status-badge--neutral" style={{ fontSize: '10.5px' }}>
                      {ev.affected_branches.includes('ALL') ? 'All Branches' : ev.affected_branches.join(', ')}
                    </span>

                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 8 }}>Semesters:</span>
                    <span className="status-badge status-badge--neutral" style={{ fontSize: '10.5px' }}>
                      {ev.affected_semesters.includes('ALL') ? 'All Semesters' : `Sem ${ev.affected_semesters.join(', ')}`}
                    </span>
                  </div>
                </div>
              ))}

              {events.length === 0 && !loadingEvents && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                  No academic events recorded yet. Use the form above to announce off-days or working Saturdays.
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SYSTEM & ERP HEALTH MONITOR                                        */}
      {/* ========================================================================= */}
      {adminTab === 'health' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* KPI Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            <div className="standard-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ERP Status
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  marginTop: '4px',
                  color:
                    healthData?.status === 'operational'
                      ? 'var(--success)'
                      : healthData?.status === 'degraded'
                      ? 'var(--warning)'
                      : 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor:
                      healthData?.status === 'operational'
                        ? 'var(--success)'
                        : healthData?.status === 'degraded'
                        ? 'var(--warning)'
                        : 'var(--danger)',
                    display: 'inline-block',
                    boxShadow: `0 0 8px ${
                      healthData?.status === 'operational'
                        ? 'var(--success)'
                        : healthData?.status === 'degraded'
                        ? 'var(--warning)'
                        : 'var(--danger)'
                    }`,
                  }}
                />
                <span style={{ textTransform: 'capitalize' }}>{healthData?.status || 'Probing...'}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Round-trip latency: <strong>{healthData?.latencyMs ?? 0} ms</strong>
              </div>
            </div>

            <div className="standard-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--info)', textTransform: 'uppercase' }}>
                Primary Upstream
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)' }}>
                {healthData?.primary?.alive ? 'Reachable' : 'Blocked / Offline'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                kiet.cybervidya.net ({healthData?.primary?.latencyMs ?? 0} ms)
              </div>
            </div>

            <div className="standard-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--success)', textTransform: 'uppercase' }}>
                Backup Gateway
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)' }}>
                {healthData?.backup?.alive ? 'Standby Ready' : 'Offline'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                cybervidya.amanpal.tech ({healthData?.backup?.latencyMs ?? 0} ms)
              </div>
            </div>

            <div className="standard-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase' }}>
                Vercel Quota Shield
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)' }}>
                Active (60 req/m)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Sliding-window IP throttle protection
              </div>
            </div>
          </div>

          {/* Upstream Diagnostics Card */}
          <Panel
            title="Live CyberVidya Upstream Diagnostics"
            subtitle="Real-time connectivity and round-trip responsiveness testing across candidate serverless proxy gateways."
          >
            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Last Checked: {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString() : 'Just now'}
                </div>
                <button
                  type="button"
                  onClick={() => runHealthPing(true)}
                  disabled={testingHealth}
                  className="action-button action-button--primary"
                  style={{ padding: '8px 16px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <RefreshCw size={13} className={testingHealth ? 'spin' : ''} />
                  <span>{testingHealth ? 'Testing Ping...' : 'Run Live Ping Test'}</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {/* Primary Card */}
                <div className="standard-card" style={{ padding: '16px', display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                      1. Official College Server (Primary)
                    </span>
                    <span
                      className={`status-badge ${healthData?.primary?.alive ? 'status-badge--success' : 'status-badge--danger'}`}
                      style={{ fontSize: '11px' }}
                    >
                      {healthData?.primary?.alive ? 'Online' : 'Unreachable'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <strong>URL:</strong> https://kiet.cybervidya.net/api
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <strong>HTTP Status:</strong> {healthData?.primary?.status || 'N/A'}
                    <span style={{ marginLeft: 10 }}>
                      <strong>Latency:</strong> {healthData?.primary?.latencyMs ?? 0} ms
                    </span>
                  </div>
                  {healthData?.primary?.error && (
                    <div style={{ fontSize: '11.5px', color: 'var(--danger)', background: 'var(--danger-soft)', padding: '6px 8px', borderRadius: 6 }}>
                      {healthData.primary.error}
                    </div>
                  )}
                </div>

                {/* Backup Card */}
                <div className="standard-card" style={{ padding: '16px', display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                      2. Fallback Proxy Gateway (Secondary)
                    </span>
                    <span
                      className={`status-badge ${healthData?.backup?.alive ? 'status-badge--success' : 'status-badge--danger'}`}
                      style={{ fontSize: '11px' }}
                    >
                      {healthData?.backup?.alive ? 'Standby Online' : 'Offline'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <strong>URL:</strong> https://cybervidya.amanpal.tech/api
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <strong>HTTP Status:</strong> {healthData?.backup?.status || 'N/A'}
                    <span style={{ marginLeft: 10 }}>
                      <strong>Latency:</strong> {healthData?.backup?.latencyMs ?? 0} ms
                    </span>
                  </div>
                  {healthData?.backup?.error && (
                    <div style={{ fontSize: '11.5px', color: 'var(--danger)', background: 'var(--danger-soft)', padding: '6px 8px', borderRadius: 6 }}>
                      {healthData.backup.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          {/* Vercel Quota Shield Info */}
          <Panel
            title="Proxy Traffic & Anti-Loop Shield"
            subtitle="Configured safeguards to protect your Vercel serverless function usage from runaway loops and scrapers."
          >
            <div style={{ display: 'grid', gap: 10, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, background: 'var(--bg-card-subtle)', borderRadius: 8 }}>
                <span style={{ fontSize: 16 }}>🛡️</span>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Anti-Runaway Client Limiter Active:</strong> Any single IP address exceeding <strong>60 requests per minute</strong> receives an instant <code>429 Too Many Requests</code> response without hitting CyberVidya, stopping infinite refresh loops.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, background: 'var(--bg-card-subtle)', borderRadius: 8 }}>
                <span style={{ fontSize: 16 }}>⚡</span>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Edge CDN Health Caching:</strong> The <code>/api/health</code> endpoint serves with <code>s-maxage=60, stale-while-revalidate=120</code>. Even if hundreds of students open Safe75 concurrently, Vercel caches the response globally, consuming only ~1 serverless invocation per minute.
                </div>
              </div>
            </div>
          </Panel>

          {/* Recent ERP Incidents Log */}
          <Panel
            title="Recent ERP Proxy Incidents & Outages"
            subtitle="Automatic log of 403 blocks, 5xx server errors, or gateway timeouts encountered during live student traffic."
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button
                type="button"
                onClick={fetchIncidents}
                disabled={loadingIncidents}
                className="action-button action-button--secondary"
                style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={13} className={loadingIncidents ? 'spin' : ''} />
                <span>Refresh Incidents</span>
              </button>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="standard-card"
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    borderLeft: `4px solid ${inc.status_code === 403 ? 'var(--warning)' : 'var(--danger)'}`,
                  }}
                >
                  <div style={{ display: 'grid', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`status-badge ${inc.status_code === 403 ? 'status-badge--warning' : 'status-badge--danger'}`} style={{ fontSize: '11px' }}>
                        HTTP {inc.status_code || 'Timeout'}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-primary)' }}>
                        {inc.endpoint || '/api'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {inc.upstream} • {inc.error_message}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(inc.created_at).toLocaleString()}
                  </span>
                </div>
              ))}

              {incidents.length === 0 && !loadingIncidents && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                  No upstream proxy incidents recorded. CyberVidya ERP servers have been stable.
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
