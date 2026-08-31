'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiBlobRequest, apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';
import {
  AcademicDepartment,
  formatAcademicDepartment,
  formatSupportArea,
  SupportArea,
} from '@/lib/routing';

type MeResponse = {
  id: string;
  schoolId: string;
  email: string | null;
  role: 'STUDENT' | 'STAFF' | 'ADMIN';
  supportArea: SupportArea | null;
  academicDepartment: AcademicDepartment | null;
  profile: { fullName: string; avatarUrl: string | null } | null;
};

type Participant = {
  id: string;
  schoolId: string;
  role?: 'STUDENT' | 'STAFF' | 'ADMIN';
  supportArea: SupportArea | null;
  academicDepartment: AcademicDepartment | null;
  profile: { fullName: string; avatarUrl: string | null } | null;
};

type Attachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploader: {
    id: string;
    schoolId: string;
    profile: { fullName: string } | null;
  };
};

type TicketEvent = {
  id: string;
  eventType: string;
  createdAt: string;
  payload: Record<string, unknown> | null;
  actor: Participant;
};

type TicketDetail = {
  id: string;
  supportArea: SupportArea;
  academicDepartment: AcademicDepartment | null;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
  studentId: string;
  assigneeId: string | null;
  student: Participant;
  assignee: Participant | null;
  attachments: Attachment[];
  events: TicketEvent[];
};

type TicketDetailClientProps = {
  ticketId: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getParticipantLabel(participant: Participant | null) {
  if (!participant) {
    return 'Unassigned';
  }

  return participant.profile?.fullName ?? participant.schoolId;
}

function getPayloadText(payload: Record<string, unknown> | null, key: string) {
  const value = payload?.[key];
  return typeof value === 'string' ? value : null;
}

function formatStaffAssignment(participant: Participant | null) {
  if (!participant) {
    return 'Claim this ticket to start the chat';
  }

  if (!participant.supportArea) {
    return 'Support staff';
  }

  return `${formatSupportArea(participant.supportArea)} staff`;
}

function describeEvent(event: TicketEvent) {
  const actor = getParticipantLabel(event.actor);

  switch (event.eventType) {
    case 'CREATED':
      return `${actor} opened the ticket.`;
    case 'CLAIMED':
      return `${actor} claimed the ticket.`;
    case 'STATUS_CHANGED': {
      const status = getPayloadText(event.payload, 'status');
      return `${actor} changed the status to ${status ?? 'an updated value'}.`;
    }
    case 'UPDATED':
      return `${actor} updated the ticket details.`;
    case 'ATTACHMENT_ADDED':
      return `${actor} added an attachment.`;
    case 'ATTACHMENT_REMOVED':
      return `${actor} removed an attachment.`;
    default:
      return `${actor} updated this ticket.`;
  }
}

export function TicketDetailClient({ ticketId }: TicketDetailClientProps) {
  const router = useRouter();
  const threadRef = useRef<HTMLDivElement | null>(null);
  const meRef = useRef<MeResponse | null>(null);
  const openingAttachmentRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const loadTicket = useCallback(async (silent = false) => {
    if (refreshInFlightRef.current || (silent && openingAttachmentRef.current)) {
      return;
    }

    refreshInFlightRef.current = true;

    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const meRequest = meRef.current ? Promise.resolve(meRef.current) : apiRequest<MeResponse>('/me');
      const [meData, ticketData] = await Promise.all([
        meRequest,
        apiRequest<TicketDetail>(`/tickets/${ticketId}`),
      ]);

      meRef.current = meData;
      setMe(meData);
      setTicket(ticketData);
      setError(null);
    } catch (requestError) {
      const messageText =
        requestError instanceof Error ? requestError.message : 'Could not load ticket';

      if (messageText.includes('401')) {
        clearToken();
        router.push('/login');
        return;
      }

      setError(messageText);
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
      refreshInFlightRef.current = false;
    }
  }, [router, ticketId]);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }

    void loadTicket(false);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      void loadTicket(true);
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [loadTicket, router, ticketId]);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) {
      return;
    }

    thread.scrollTop = thread.scrollHeight;
  }, [ticket?.events.length]);

  const isAssignee = Boolean(me?.id && ticket?.assignee?.id && me.id === ticket.assignee.id);
  const isAdmin = me?.role === 'ADMIN';
  const canClaim = Boolean(
    me?.role !== 'STUDENT' &&
      ticket &&
      ticket.status !== 'RESOLVED' &&
      (!ticket.assigneeId || ticket.assigneeId === me?.id),
  );
  const canUpdateStatus = Boolean(ticket && (isAdmin || isAssignee));
  const canSendMessage = Boolean(
    ticket &&
      me &&
      (isAssignee || (me.role === 'STUDENT' && ticket.assigneeId)),
  );
  const lastActivityAt = ticket
    ? ticket.events[ticket.events.length - 1]?.createdAt ?? ticket.updatedAt
    : null;

  const statusLabel = useMemo(() => ticket?.status.toLowerCase() ?? 'open', [ticket?.status]);

  const submitMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!ticket || !message.trim() || !canSendMessage) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const updatedTicket = await apiRequest<TicketDetail>(`/tickets/${ticket.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      setTicket(updatedTicket);
      setMessage('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not send message');
    } finally {
      setSubmitting(false);
    }
  };

  const claimTicket = async () => {
    if (!ticket) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiRequest(`/tickets/${ticket.id}/claim`, { method: 'POST' });
      await loadTicket(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not claim ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (status: 'IN_PROGRESS' | 'RESOLVED') => {
    if (!ticket) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiRequest(`/tickets/${ticket.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadTicket(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update ticket status');
    } finally {
      setSubmitting(false);
    }
  };

  const openAttachment = async (attachment: Attachment) => {
    if (!ticket) {
      return;
    }

    const viewer = window.open('about:blank', '_blank');
    openingAttachmentRef.current = true;
    setOpeningAttachmentId(attachment.id);
    setError(null);

    try {
      const blob = await apiBlobRequest(`/tickets/${ticket.id}/attachments/${attachment.id}`);
      const fileUrl = URL.createObjectURL(blob);

      if (viewer) {
        viewer.opener = null;
        viewer.location.href = fileUrl;
      } else {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = attachment.fileName;
        document.body.append(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } catch (requestError) {
      viewer?.close();
      setError(requestError instanceof Error ? requestError.message : 'Could not open attachment');
    } finally {
      openingAttachmentRef.current = false;
      setOpeningAttachmentId(null);
    }
  };

  if (loading) {
    return <p>Loading ticket...</p>;
  }

  if (!ticket || !me) {
    return (
      <div className="card stack">
        <p>{error ?? 'Unable to load this ticket.'}</p>
        <button className="secondary" type="button" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="card ticket-header-card">
        <div className="panel-header">
          <div className="stack" style={{ gap: 6 }}>
            <div className="row wrap-actions">
              <button className="secondary" type="button" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </button>
              <span className={`status-pill ${statusLabel}`}>{ticket.status}</span>
              <span className="badge subtle">{formatSupportArea(ticket.supportArea)}</span>
              <span className="badge subtle">{formatAcademicDepartment(ticket.academicDepartment)}</span>
              <span className="code">{ticket.id}</span>
            </div>
            <div className="stack" style={{ gap: 4 }}>
              <p className="eyebrow">Ticket Workspace</p>
              <h2>{ticket.subject}</h2>
              <p className="eyebrow">Student Question / Problem</p>
              <p style={{ whiteSpace: 'pre-wrap' }}>{ticket.description}</p>
            </div>
          </div>
        <div className="ticket-refresh-note">
          <strong>{refreshing ? 'Checking updates...' : 'Live updates on'}</strong>
          <span className="small">Checks every 30 seconds while visible.</span>
        </div>
      </div>
        {error ? <p style={{ color: 'var(--warn)', margin: 0 }}>{error}</p> : null}
      </section>

      <section className="ticket-detail-grid">
        <article className="card stack">
          <div className="panel-header">
            <div className="stack" style={{ gap: 4 }}>
              <p className="eyebrow">Participants</p>
              <h3>Who is on this ticket</h3>
            </div>
          </div>
          <div className="ticket-meta-grid">
            <div className="ticket-meta-item">
              <span className="small">Student</span>
              <strong>{getParticipantLabel(ticket.student)}</strong>
              <span className="small code">
                {ticket.student.schoolId} - {formatAcademicDepartment(ticket.student.academicDepartment)}
              </span>
            </div>
            <div className="ticket-meta-item">
              <span className="small">Assigned support staff</span>
              <strong>{getParticipantLabel(ticket.assignee)}</strong>
              <span className="small">{formatStaffAssignment(ticket.assignee)}</span>
            </div>
            <div className="ticket-meta-item">
              <span className="small">Opened</span>
              <strong>{formatDateTime(ticket.createdAt)}</strong>
            </div>
            <div className="ticket-meta-item">
              <span className="small">Last activity</span>
              <strong>{formatDateTime(lastActivityAt ?? ticket.updatedAt)}</strong>
            </div>
          </div>

          {me.role !== 'STUDENT' ? (
            <div className="row wrap-actions">
              <button className="secondary" type="button" disabled={!canClaim || submitting} onClick={() => void claimTicket()}>
                Claim Ticket
              </button>
              <button
                className="secondary"
                type="button"
                disabled={!canUpdateStatus || ticket.status === 'IN_PROGRESS' || submitting}
                onClick={() => void updateStatus('IN_PROGRESS')}
              >
                Mark In Progress
              </button>
              <button
                type="button"
                disabled={!canUpdateStatus || ticket.status === 'RESOLVED' || submitting}
                onClick={() => void updateStatus('RESOLVED')}
              >
                Resolve
              </button>
            </div>
          ) : null}
        </article>

        <article className="card stack">
          <div className="panel-header">
            <div className="stack" style={{ gap: 4 }}>
              <p className="eyebrow">Attachments</p>
              <h3>Files on this ticket</h3>
            </div>
            <span className="badge">{ticket.attachments.length}</span>
          </div>
          {ticket.attachments.length === 0 ? (
            <p className="small">No attachments have been added yet.</p>
          ) : (
            <div className="ticket-attachment-list">
              {ticket.attachments.map((attachment) => (
                <div key={attachment.id} className="ticket-attachment-item">
                  <div className="ticket-attachment-summary">
                    <div className="stack" style={{ gap: 4 }}>
                      <strong>{attachment.fileName}</strong>
                      <span className="small">
                        Added by {attachment.uploader.profile?.fullName ?? attachment.uploader.schoolId} on{' '}
                        {formatDateTime(attachment.createdAt)}
                      </span>
                    </div>
                    <button
                      className="secondary"
                      type="button"
                      disabled={openingAttachmentId === attachment.id}
                      onClick={() => void openAttachment(attachment)}
                    >
                      {openingAttachmentId === attachment.id ? 'Opening...' : 'Open'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="card stack">
        <div className="panel-header">
          <div className="stack" style={{ gap: 4 }}>
            <p className="eyebrow">Live Thread</p>
            <h3>Ticket conversation</h3>
            <p className="small">
              Live chat starts after an admin or staff member claims the ticket.
            </p>
          </div>
        </div>

        <div ref={threadRef} className="ticket-thread">
          {ticket.events.map((event) =>
            event.eventType === 'MESSAGE' ? (
              <div
                key={event.id}
                className={`chat-bubble ${event.actor.id === me.id ? 'user' : 'assistant'}`}
              >
                <div className="row wrap-actions">
                  <strong>{getParticipantLabel(event.actor)}</strong>
                  <span className="small">{formatDateTime(event.createdAt)}</span>
                </div>
                <p style={{ whiteSpace: 'pre-wrap' }}>{getPayloadText(event.payload, 'message') ?? ''}</p>
              </div>
            ) : (
              <div key={event.id} className="ticket-system-event">
                <strong>{describeEvent(event)}</strong>
                <span className="small">{formatDateTime(event.createdAt)}</span>
              </div>
            ),
          )}
        </div>

        <form className="stack" onSubmit={submitMessage}>
          <textarea
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={
              canSendMessage
                ? 'Write a message on this ticket'
                : me.role === 'STUDENT'
                  ? 'An admin or staff member must claim this ticket before live chat starts.'
                  : ticket.assigneeId
                    ? 'Only the assigned admin or staff member can reply here.'
                    : 'Claim this ticket to start the conversation.'
            }
            disabled={!canSendMessage || submitting}
          />
          <div className="row wrap-actions">
            <button disabled={!canSendMessage || !message.trim() || submitting}>
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
            {!canSendMessage ? (
              <span className="small">
                {me.role === 'STUDENT'
                  ? ticket.assigneeId
                    ? 'This chat is reserved for you and the assigned admin or staff member.'
                    : 'Waiting for an admin or staff member to claim this ticket before live chat opens.'
                  : ticket.assigneeId
                    ? 'This chat is reserved for the student and the assigned admin or staff member.'
                    : 'Claim the ticket first so the student knows who is helping.'}
              </span>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
