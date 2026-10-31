import React, { useState } from 'react';
import { IecCleanlinessIssue, User } from '../../types';
import { Drawer } from '../common/Drawer';
import { StatusBadge } from '../common/Badge';
import { ImageLightbox } from './ImageLightbox';
import { matrixStore } from '../../services/store';
import {
  AlertCircle,
  MapPin,
  User as UserIcon,
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  ShieldCheck,
  Image as ImageIcon,
  History
} from 'lucide-react';

interface IecIssueDrawerProps {
  issue: IecCleanlinessIssue | null;
  onClose: () => void;
  currentUser: User;
  onIssueUpdated?: () => void;
}

export const IecIssueDrawer: React.FC<IecIssueDrawerProps> = ({
  issue,
  onClose,
  currentUser,
  onIssueUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'evidence' | 'timeline' | 'reopening'>('details');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Decision state
  const [decisionType, setDecisionType] = useState<'approved_closed' | 'rejected' | 'action_required' | null>(null);
  const [decisionRemarks, setDecisionRemarks] = useState('');

  // Reopening request decision state
  const [reopeningReqId, setReopeningReqId] = useState<string | null>(null);
  const [reopeningDecision, setReopeningDecision] = useState<'approved' | 'rejected' | null>(null);
  const [reopeningRemarks, setReopeningRemarks] = useState('');

  if (!issue) return null;

  const canDecide = currentUser.role === 'ULB_OFFICER' && Boolean(issue.canReview) &&
    (issue.status === 'pending_review' || issue.status === 'action_required');

  const canDecideReopening = (currentUser.role === 'ULB_OFFICER' || currentUser.role === 'HMS_SUPER_ADMIN') &&
    issue.reopeningRequests.some(r => r.status === 'pending');

  const allPhotos = [
    ...issue.beforePhotos.map(p => ({ ...p, type: 'before' })),
    ...issue.afterPhotos.map(p => ({ ...p, type: 'after' }))
  ];

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    try {
    e.preventDefault();
    if (!decisionType) return;
    if ((decisionType === 'rejected' || decisionType === 'action_required') && !decisionRemarks.trim()) {
      alert('Remarks are required for rejection or corrective action.');
      return;
    }

    await matrixStore.decideIecIssue(issue.id, decisionType, decisionRemarks, currentUser);
    setDecisionType(null);
    setDecisionRemarks('');
    onIssueUpdated?.();

    } catch (error) { alert(error instanceof Error ? error.message : "Backend action failed."); }
  };

  const handleReopeningSubmit = async (e: React.FormEvent) => {
    try {
    e.preventDefault();
    if (!reopeningReqId || !reopeningDecision) return;
    if (reopeningDecision === 'rejected' && !reopeningRemarks.trim()) {
      alert('Remarks are required when rejecting a reopening request.');
      return;
    }

    await matrixStore.decideReopeningRequest(issue.id, reopeningReqId, reopeningDecision, reopeningRemarks, currentUser);
    setReopeningReqId(null);
    setReopeningDecision(null);
    setReopeningRemarks('');
    onIssueUpdated?.();

    } catch (error) { alert(error instanceof Error ? error.message : "Backend action failed."); }
  };

  return (
    <Drawer
      isOpen={Boolean(issue)}
      onClose={onClose}
      title={`Cleanliness Grievance ${issue.ticketNumber}`}
      subtitle={`Category: ${issue.category.replace(/_/g, ' ')} · Priority: ${issue.priority.toUpperCase()} · Cycle #${issue.currentCycle}`}
      width="3xl"
    >
      {/* Top Summary Box */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <StatusBadge status={issue.status} size="md" />
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200/60 rounded text-slate-700 capitalize">
              Cycle #{issue.currentCycle}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>24h SLA Deadline: <strong>{issue.deadlineTimestamp}</strong></span>
          </div>
        </div>

        <div className="text-xs text-slate-600">
          <strong className="text-slate-900 block mb-0.5">IEC-reported issue:</strong>
          <p className="bg-white p-2.5 rounded-lg border border-slate-200 italic">
            "{issue.complaintDescription}"
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold text-slate-500">
        {[
          { id: 'details', label: 'Field Review', icon: ShieldCheck },
          { id: 'evidence', label: `Before & After Photos (${allPhotos.length})`, icon: ImageIcon },
          { id: 'timeline', label: `Timeline (${issue.timeline.length})`, icon: History },
          { id: 'reopening', label: `Reopening Requests (${issue.reopeningRequests.length})`, icon: RotateCcw }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 py-2.5 border-b-2 transition-colors ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Field Review & ULB Decision */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
              <span className="text-slate-400 block font-medium uppercase mb-0.5">Location Address</span>
              <p className="font-semibold text-slate-900">{issue.locationAddress}</p>
              <p className="text-slate-500 mt-1 flex items-center gap-1 font-mono">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                GPS Sample Accuracy: {issue.gpsDistanceMeters}m from pin
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
              <span className="text-slate-400 block font-medium uppercase mb-0.5">Reporting IEC member</span>
              <p className="font-semibold text-slate-900">{issue.reportedBy}</p>
              <p className="text-slate-500 mt-1 font-mono">{issue.reportedDate}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
              <span className="text-slate-400 block font-medium uppercase mb-0.5">Assigned Daroga</span>
              <p className="font-semibold text-slate-900">{issue.assignedDarogaName}</p>
              <p className="text-slate-500 mt-1">Inspection attempts: {issue.attemptsCount}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
              <span className="text-slate-400 block font-medium uppercase mb-0.5">Sanitary Inspector</span>
              <p className="font-semibold text-slate-900">{issue.sanitaryInspectorName || 'Pending'}</p>
              <p className="text-slate-500 mt-1">
                Sanitary Inspector decision: <strong className="capitalize text-slate-800">{issue.qcDecision?.replace(/_/g, ' ') || 'Awaiting'}</strong>
              </p>
            </div>
          </div>

          {issue.qcRemarks && (
            <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg text-xs space-y-1">
              <span className="font-bold text-blue-900 uppercase tracking-wider block">
                Sanitary Inspector field notes
              </span>
              <p className="text-blue-800">
                {issue.qcRemarks}
              </p>
            </div>
          )}

          {issue.ulbRemarks && (
            <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-lg text-xs space-y-1">
              <span className="font-bold text-indigo-900 uppercase tracking-wider block">
                ULB Officer Final Decision Remarks
              </span>
              <p className="text-indigo-800">
                {issue.ulbRemarks}
              </p>
            </div>
          )}

          {/* ULB Decision Action Block */}
          {canDecide && (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    ULB Officer Grievance Determination
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Action Required sends the SAME issue back to Daroga for corrective inspection under 24-hr SLA.
                  </p>
                </div>
              </div>

              {!decisionType ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setDecisionType('approved_closed')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve & Close</span>
                  </button>

                  <button
                    onClick={() => setDecisionType('action_required')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Action Required (Return to Daroga)</span>
                  </button>

                  <button
                    onClick={() => setDecisionType('rejected')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Grievance</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleDecisionSubmit} className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase">
                      Confirming Decision: <span className="text-indigo-600">{decisionType.replace(/_/g, ' ')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setDecisionType(null)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Change Decision
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      {decisionType === 'approved_closed' ? 'Closing Remarks (Optional)' : 'Required Specific Reason / Instructions *'}
                    </label>
                    <textarea
                      required={decisionType !== 'approved_closed'}
                      rows={2}
                      value={decisionRemarks}
                      onChange={(e) => setDecisionRemarks(e.target.value)}
                      placeholder={
                        decisionType === 'action_required'
                          ? 'Specify why site was not clean and instructions for Daroga...'
                          : 'Enter review justification...'
                      }
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDecisionType(null)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
                    >
                      Confirm Local Decision
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Photos Evidence */}
      {activeTab === 'evidence' && (
        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              1. Before Intervention (IEC-reported issue Evidence)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {issue.beforePhotos.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-indigo-400 cursor-pointer shadow-xs transition-all"
                >
                  <div className="h-36 bg-slate-900 flex flex-col items-center justify-center p-4 text-center text-white">
                    <ImageIcon className="w-8 h-8 text-rose-400 mb-2" />
                    <span className="text-xs font-semibold">{p.caption}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 text-[15px] text-slate-500 flex justify-between font-mono">
                    <span className="text-rose-700 font-bold uppercase">Before</span>
                    <span>{p.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              2. After Intervention (Daroga Field Clearance Evidence)
            </h4>
            {issue.afterPhotos.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                No clearance photos uploaded yet by assigned Daroga.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {issue.afterPhotos.map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => { setLightboxIndex(issue.beforePhotos.length + idx); setLightboxOpen(true); }}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-indigo-400 cursor-pointer shadow-xs transition-all"
                  >
                    <div className="h-36 bg-slate-900 flex flex-col items-center justify-center p-4 text-center text-white">
                      <ImageIcon className="w-8 h-8 text-emerald-400 mb-2" />
                      <span className="text-xs font-semibold">{p.caption}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 text-[15px] text-slate-500 flex justify-between font-mono">
                      <span className="text-emerald-700 font-bold uppercase">After</span>
                      <span>{p.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ImageLightbox
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            images={allPhotos}
            initialIndex={lightboxIndex}
          />
        </div>
      )}

      {/* Tab 3: Timeline */}
      {activeTab === 'timeline' && (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {issue.timeline.map((event) => (
            <div key={event.id} className="relative">
              <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-indigo-600 ring-4 ring-white" />
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">{event.action}</span>
                  <span className="text-[15px] font-mono text-slate-400">{event.timestamp}</span>
                </div>
                <p className="text-slate-600">
                  By <strong>{event.actorName}</strong> ({event.actorRole})
                </p>
                {event.remarks && (
                  <p className="text-slate-500 italic mt-1">
                    "{event.remarks}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Reopening Requests */}
      {activeTab === 'reopening' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <strong>Reopening and inspection deadline:</strong> Approving an IEC member?s reopening request creates a new cycle on the same issue and preserves its history. The backend supplies the next inspection deadline.
          </div>

          {issue.reopeningRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No reopening requests filed for this grievance.
            </div>
          ) : (
            issue.reopeningRequests.map((req) => (
              <div key={req.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 font-mono">Request #{req.id}</span>
                    <span className="text-xs text-slate-400 block font-mono">Filed on {req.requestedAt}</span>
                  </div>
                  <StatusBadge status={req.status} size="sm" />
                </div>

                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                  "{req.reason}"
                </p>

                {req.decidedAt && (
                  <div className="text-xs text-slate-500 font-mono pt-1 border-t border-slate-100">
                    Decided by {req.decidedBy} at {req.decidedAt}: {req.remarks}
                  </div>
                )}

                {req.status === 'pending' && canDecideReopening && (
                  <div className="pt-2 border-t border-slate-100">
                    {reopeningReqId !== req.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setReopeningReqId(req.id); setReopeningDecision('approved'); }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                        >
                          Approve Reopening (Start New Cycle)
                        </button>
                        <button
                          onClick={() => { setReopeningReqId(req.id); setReopeningDecision('rejected'); }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                        >
                          Reject Reopening
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleReopeningSubmit} className="space-y-2 pt-1">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Remarks for {reopeningDecision} of #{req.id} *
                        </label>
                        <input
                          type="text"
                          required={reopeningDecision === 'rejected'}
                          value={reopeningRemarks}
                          onChange={(e) => setReopeningRemarks(e.target.value)}
                          placeholder="Provide justification..."
                          className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => { setReopeningReqId(null); setReopeningDecision(null); }}
                            className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1 text-xs font-semibold bg-indigo-600 text-white rounded shadow-xs"
                          >
                            Submit Reopening Decision
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </Drawer>
  );
};
