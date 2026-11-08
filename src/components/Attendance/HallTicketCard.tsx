import React, { useState, useEffect } from 'react';
import type { StudentDetails } from '../../types/kiet';
import type { SubjectSummary } from '../../utils/attendanceCalculations';
import type { ExamSession, HallTicketOption } from '../../types/bridge';
import {
  Ticket,
  Lock,
  RefreshCw,
  AlertTriangle,
  FileText,
  Eye,
  Download,
  ExternalLink,
  X,
  CheckCircle,
} from '../Icons';
import {
  fetchStudentIdUnified,
  fetchExamSessionsUnified,
  fetchHallTicketOptionsUnified,
  downloadHallTicketPdfUnified,
  getStoredSession,
} from '../../services/cybervidyaApi';

interface HallTicketCardProps {
  attendance: StudentDetails | null;
  subjects: SubjectSummary[];
  overallSummary?: {
    present: number;
    total: number;
    percentage: number;
  } | null;
}

export function HallTicketCard({ attendance, overallSummary }: HallTicketCardProps) {
  const [resolvedStudentId, setResolvedStudentId] = useState<number | string | null>(null);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | string | null>(null);
  const [hallTicketOptions, setHallTicketOptions] = useState<HallTicketOption[]>([]);

  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | string | null>(null);
  const [previewingId, setPreviewingId] = useState<number | string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const [error, setError] = useState<string | null>(null);

  // Step 1: Resolve Student ID
  useEffect(() => {
    let isMounted = true;
    async function resolveStudent() {
      const session = getStoredSession();
      if (attendance?.studentId) {
        if (isMounted) setResolvedStudentId(attendance.studentId);
        return;
      }
      if (session.studentId) {
        if (isMounted) setResolvedStudentId(session.studentId);
        return;
      }
      if (session.hasToken) {
        try {
          const info = await fetchStudentIdUnified();
          if (isMounted && info.studentId) {
            setResolvedStudentId(info.studentId);
          }
        } catch (err) {
          console.warn('Could not auto-resolve studentId:', err);
        }
      }
    }
    resolveStudent();
    return () => {
      isMounted = false;
    };
  }, [attendance]);

  // Step 2: Fetch Academic Exam Sessions when studentId is resolved
  useEffect(() => {
    if (!resolvedStudentId) return;

    let isMounted = true;
    async function loadSessions() {
      setLoadingSessions(true);
      setError(null);
      try {
        const fetchedSessions = await fetchExamSessionsUnified(resolvedStudentId!);
        if (!isMounted) return;
        setSessions(fetchedSessions);
        if (fetchedSessions.length > 0) {
          setSelectedSessionId(fetchedSessions[0].sessionId);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error fetching exam sessions:', err);
          setError(err.message || 'Failed to fetch exam sessions.');
        }
      } finally {
        if (isMounted) setLoadingSessions(false);
      }
    }

    loadSessions();
    return () => {
      isMounted = false;
    };
  }, [resolvedStudentId]);

  // Step 3: Fetch Available Hall Ticket Options when selectedSessionId changes
  useEffect(() => {
    if (!selectedSessionId) {
      setHallTicketOptions([]);
      return;
    }

    let isMounted = true;
    async function loadOptions() {
      setLoadingOptions(true);
      setError(null);
      try {
        const options = await fetchHallTicketOptionsUnified(selectedSessionId!);
        if (isMounted) {
          setHallTicketOptions(options);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error fetching hall ticket options:', err);
          setError(err.message || 'Failed to fetch hall ticket options.');
          setHallTicketOptions([]);
        }
      } finally {
        if (isMounted) setLoadingOptions(false);
      }
    }

    loadOptions();
    return () => {
      isMounted = false;
    };
  }, [selectedSessionId]);

  // Step 4: Download Binary PDF File
  const handleDownloadPdf = async (option: HallTicketOption) => {
    setDownloadingId(option.id);
    try {
      const blob = await downloadHallTicketPdfUnified(option.id, resolvedStudentId);
      const url = URL.createObjectURL(blob);
      const cleanTitle = (option.title || 'Hall_Ticket').replace(/[^a-zA-Z0-9]/g, '_');

      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      if (isIos) {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cleanTitle}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      alert(`Download failed: ${err.message || String(err)}`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Preview PDF Inline
  const handlePreviewPdf = async (option: HallTicketOption) => {
    setPreviewingId(option.id);
    try {
      const blob = await downloadHallTicketPdfUnified(option.id, resolvedStudentId);
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
      setPreviewTitle(option.title);
    } catch (err: any) {
      alert(`Preview failed: ${err.message || String(err)}`);
    } finally {
      setPreviewingId(null);
    }
  };

  const closePreviewModal = () => {
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
    }
    setPreviewPdfUrl(null);
    setPreviewTitle('');
  };

  const overallPct = overallSummary?.percentage ?? 0;
  const isEligible = overallPct >= 75;
  const isConditional = overallPct >= 70 && overallPct < 75;

  return (
    <div
      className="hall-ticket-container"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '18px 20px',
        display: 'grid',
        gap: 16,
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'var(--primary-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <Ticket size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Official Examination Hall Ticket
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Download official admit cards directly from KIET CyberVidya ERP.
            </p>
          </div>
        </div>

        {/* Exam Session Dropdown */}
        {sessions.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Session:
            </label>
            <select
              value={selectedSessionId ?? ''}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="standard-input"
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {sessions.map((sess) => (
                <option key={sess.sessionId} value={sess.sessionId}>
                  {sess.sessionName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Eligibility & Student Info Summary */}
      {attendance && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
            padding: 12,
            borderRadius: 10,
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Name</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {attendance.fullName || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Roll / Reg. No</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {attendance.registrationNumber || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Branch & Semester</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginTop: 2 }}>
              {attendance.branchShortName || 'N/A'} — {attendance.semesterName || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Exam Eligibility</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isEligible ? 'var(--success)' : isConditional ? 'var(--warning)' : 'var(--danger)', marginTop: 2 }}>
              {overallPct.toFixed(1)}% ({isEligible ? 'Eligible' : isConditional ? 'Conditional' : 'Shortage'})
            </div>
          </div>
        </div>
      )}

      {/* Main Hall Tickets Options Section */}
      {!attendance && !getStoredSession().hasToken ? (
        <div
          style={{
            padding: '24px 20px',
            textAlign: 'center',
            background: 'var(--bg-card-subtle)',
            borderRadius: 12,
            border: '1px dashed var(--border)',
            display: 'grid',
            gap: 6,
            justifyItems: 'center',
          }}
        >
          <Lock size={24} style={{ color: 'var(--text-muted)' }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            CyberVidya Session Required
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Log in to CyberVidya ERP via Bunk Helper to fetch and download your official exam Hall Tickets directly.
          </div>
        </div>
      ) : loadingSessions ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <RefreshCw size={14} className="spin-clockwise" />
          <span>Loading academic exam sessions...</span>
        </div>
      ) : error ? (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: 'var(--danger-soft)',
            border: '1px solid var(--danger)',
            color: 'var(--text-primary)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
            <span>{error}</span>
          </span>
          {resolvedStudentId && (
            <button
              onClick={() => {
                setError(null);
                const currentId = resolvedStudentId;
                setResolvedStudentId(null);
                setTimeout(() => setResolvedStudentId(currentId), 10);
              }}
              className="action-button action-button--secondary"
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              Retry
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              Available Hall Tickets
            </h3>
            {loadingOptions && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <RefreshCw size={11} className="spin-clockwise" />
                <span>Checking options...</span>
              </span>
            )}
          </div>

          {hallTicketOptions.length === 0 ? (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                background: 'var(--bg-card-subtle)',
                borderRadius: 10,
                color: 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              {loadingOptions
                ? 'Checking for available hall tickets...'
                : 'No hall tickets have been issued yet for this examination session.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {hallTicketOptions.map((opt) => (
                <div
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 240px' }}>
                    <FileText size={18} style={{ color: 'var(--primary)' }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {opt.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>
                        Official CyberVidya Hall Ticket • ID #{opt.id}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => handlePreviewPdf(opt)}
                      disabled={previewingId === opt.id}
                      className="action-button action-button--secondary"
                      style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <Eye size={13} />
                      <span>{previewingId === opt.id ? 'Loading...' : 'View PDF'}</span>
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(opt)}
                      disabled={downloadingId === opt.id}
                      className="action-button action-button--primary"
                      style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <Download size={13} />
                      <span>{downloadingId === opt.id ? 'Downloading...' : 'Download PDF'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PDF Inline Viewer Modal */}
      {previewPdfUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              width: '95%',
              maxWidth: 900,
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-card-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} style={{ color: 'var(--primary)' }} />
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                    {previewTitle}
                  </h3>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                    Official Hall Ticket Document Preview
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button action-button--secondary"
                  style={{ padding: '5px 12px', fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <ExternalLink size={12} />
                  <span>Open Fullscreen</span>
                </a>
                <a
                  href={previewPdfUrl}
                  download={`${previewTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}
                  className="action-button action-button--primary"
                  style={{ padding: '5px 12px', fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Download size={12} />
                  <span>Download</span>
                </a>
                <button
                  onClick={closePreviewModal}
                  className="action-button action-button--secondary"
                  style={{ padding: '5px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <X size={12} />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Modal Body / PDF iframe */}
            <div style={{ flex: 1, width: '100%', background: '#525659' }}>
              <iframe
                src={previewPdfUrl}
                title={previewTitle}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
