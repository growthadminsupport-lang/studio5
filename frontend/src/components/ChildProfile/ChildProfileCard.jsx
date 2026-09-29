import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Pencil, Baby, Plus, X, Check, AlertTriangle } from 'lucide-react';
import { useChildren } from '../../context/ChildrenContext';
import { getAgeLabel, getAgeShort, getBornLabel, getSexLabel } from '../../utils/childDisplay';

// ============================================================
// Child profile card — shared by Dashboard, Growth, Puberty and
// Bone age. Switching a child here updates the selected child for
// every page and keeps you on the page you're on.
// ============================================================

function ChildAvatar({ size = 56, iconSize = 28 }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[#a7ebd9] dark:bg-teal-500/50"
      style={{ width: size, height: size }}
    >
      <Baby size={iconSize} strokeWidth={1.5} className="text-[#056559] dark:text-teal-300" />
    </div>
  );
}

function ModalShell({ title, onClose, children, footer }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X size={20} />
          </button>
        </div>

        {children}

        {footer && <div className="mt-5 flex items-center">{footer}</div>}
      </div>
    </div>
  );
}

function SwitchChildModal({ kids, activeChildId, onSelect, onClose, onManage }) {
  return (
    <ModalShell
      title="Switch child"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onManage}
          className="ml-auto text-sm font-semibold text-[#056559] dark:text-teal-300 hover:underline"
        >
          Manage
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {kids.map((kid) => {
          const active = kid.id === activeChildId;
          return (
            <button
              key={kid.id}
              type="button"
              onClick={() => {
                onSelect(kid.id);
                onClose();
              }}
              className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition ${
                active
                  ? 'border-[#056559] dark:border-teal-400 bg-[#eaf6f3] dark:bg-teal-500/10'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
              }`}
            >
              {active && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#056559] dark:bg-teal-400 text-white dark:text-slate-950">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              <ChildAvatar />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{kid.fullName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{getAgeShort(kid.dateOfBirth)}</p>
              </div>
            </button>
          );
        })}

        <Link
          to="/children/new"
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#bcece0] dark:border-teal-500/30 p-4 text-center text-[#056559] dark:text-teal-300 transition hover:bg-[#f2fbf9] dark:hover:bg-teal-500/10"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf6f3] dark:bg-teal-500/10">
            <Plus size={22} />
          </span>
          <p className="text-sm font-semibold">Add child</p>
        </Link>
      </div>
    </ModalShell>
  );
}

// Second, smaller confirm dialog stacked on top of ManageChildrenModal —
// the X starts the removal, this is the actual point of no return.
function ConfirmRemoveDialog({ child, onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
            <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Remove child?</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              This permanently deletes their growth, screening, and bone age history.
            </p>
          </div>
        </div>

        <p className="mb-5 text-sm text-slate-700 dark:text-slate-300">
          Remove {child.fullName}? This can&apos;t be undone.
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function ManageChildrenModal({ kids, onClose, onRemove }) {
  const [pendingRemoveId, setPendingRemoveId] = useState(null);
  const pendingChild = kids.find((k) => k.id === pendingRemoveId) ?? null;

  return (
    <ModalShell
      title="Remove a child"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="ml-auto text-sm font-semibold text-[#056559] dark:text-teal-300 hover:underline"
        >
          Done
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {kids.length === 0 && (
          <p className="col-span-2 text-sm text-slate-500 dark:text-slate-400">No children on this account yet.</p>
        )}

        {kids.map((kid) => (
          <div
            key={kid.id}
            className="relative flex flex-col items-center gap-2 rounded-xl border-2 border-[#056559] dark:border-teal-400 bg-[#eaf6f3] dark:bg-teal-500/10 p-4 text-center"
          >
            <button
              type="button"
              aria-label={`Remove ${kid.fullName}`}
              onClick={() => setPendingRemoveId(kid.id)}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition hover:bg-red-600"
            >
              <X size={13} strokeWidth={2.5} />
            </button>
            <ChildAvatar />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{kid.fullName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{getAgeShort(kid.dateOfBirth)}</p>
            </div>
          </div>
        ))}
      </div>

      {pendingChild && (
        <ConfirmRemoveDialog
          child={pendingChild}
          onCancel={() => setPendingRemoveId(null)}
          onConfirm={() => {
            onRemove(pendingChild.id);
            setPendingRemoveId(null);
          }}
        />
      )}
    </ModalShell>
  );
}

// Shown in place of a page's content when the account has no child.
export function NoChildState() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50/50 dark:bg-slate-900 px-4 py-16 text-center">
      <p className="text-sm text-slate-500 dark:text-slate-400">Add a child to start tracking growth.</p>
      <Link
        to="/children/new"
        className="inline-flex items-center gap-1 rounded-full bg-[#056559] dark:bg-teal-400 px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-950 transition hover:bg-[#03443c] dark:hover:bg-teal-300"
      >
        <Plus size={16} />
        Add child
      </Link>
    </div>
  );
}

export default function ChildProfileCard() {
  const { children: kids, activeChild: child, activeChildId, setActiveChildId, removeChild } = useChildren();
  const [modal, setModal] = useState(null); // null | 'switch' | 'manage'

  return (
    <>
      {child && (
        <div className="relative mb-6 rounded-2xl bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 shadow-2xs sm:p-8">
          {/* Switch + edit share one column so their centers line up */}
          <div className="absolute right-4 top-4 flex flex-col items-center gap-2 sm:right-6 sm:top-6">
            <button
              type="button"
              aria-label="Switch child"
              onClick={() => setModal('switch')}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-[#056559] dark:hover:bg-slate-700 dark:hover:text-teal-300"
            >
              <ArrowLeftRight size={18} />
            </button>

            <Link
              to={`/children/${child.id}/edit`}
              aria-label="Edit child profile"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#056559] dark:bg-teal-400 text-white dark:text-slate-950 shadow-sm transition hover:bg-[#03443c] dark:hover:bg-teal-300"
            >
              <Pencil size={14} />
            </Link>
          </div>

          <div className="flex items-center gap-4 pr-12 sm:gap-5">
            <ChildAvatar size={64} iconSize={34} />

            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">{child.fullName}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {[getSexLabel(child.sex), getAgeLabel(child.dateOfBirth), getBornLabel(child.dateOfBirth)].filter(Boolean).map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-[#bcece0] dark:border-teal-500/30 px-2 py-0.5 text-xs font-medium text-[#056559] dark:text-teal-300"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'switch' && (
        <SwitchChildModal
          kids={kids}
          activeChildId={activeChildId}
          onSelect={setActiveChildId}
          onClose={() => setModal(null)}
          onManage={() => setModal('manage')}
        />
      )}

      {modal === 'manage' && (
        <ManageChildrenModal kids={kids} onClose={() => setModal(null)} onRemove={removeChild} />
      )}
    </>
  );
}