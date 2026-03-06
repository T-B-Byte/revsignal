'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface Task {
  task_id: string;
  description: string;
  due_date: string | null;
  status: 'open' | 'done';
  created_at: string;
  completed_at: string | null;
}

export function UserTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New task form
  const [showForm, setShowForm] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState('');
  const [saving, setSaving] = useState(false);

  const [showDone, setShowDone] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
      }
    } catch {
      setError('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (showForm && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showForm]);

  // ── Actions ────────────────────────────────────────────────────────

  async function createTask() {
    if (!newDesc.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newDesc.trim(),
          due_date: newDate || undefined,
        }),
      });
      if (res.ok) {
        setNewDesc('');
        setNewDate('');
        setShowForm(false);
        await loadTasks();
      } else {
        setError('Failed to create task.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setCreating(false);
    }
  }

  async function toggleDone(task: Task) {
    const newStatus = task.status === 'done' ? 'open' : 'done';
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.task_id === task.task_id ? { ...t, status: newStatus } : t
      )
    );
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.task_id, status: newStatus }),
      });
      if (!res.ok) {
        // Revert on failure
        setTasks((prev) =>
          prev.map((t) =>
            t.task_id === task.task_id ? { ...t, status: task.status } : t
          )
        );
      }
    } catch {
      setTasks((prev) =>
        prev.map((t) =>
          t.task_id === task.task_id ? { ...t, status: task.status } : t
        )
      );
    }
  }

  function startEdit(task: Task) {
    setEditingId(task.task_id);
    setEditDesc(task.description);
    setEditDate(task.due_date ?? '');
  }

  async function saveEdit() {
    if (!editingId || !editDesc.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: editingId,
          description: editDesc.trim(),
          due_date: editDate || null,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        await loadTasks();
      }
    } catch {
      setError('Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
    try {
      await fetch('/api/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      });
    } catch {
      await loadTasks(); // Revert on failure
    }
  }

  // ── Render ─────────────────────────────────────────────────────────

  const openTasks = tasks.filter((t) => t.status === 'open');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>My Tasks</CardTitle>
          {openTasks.length > 0 && (
            <span className="rounded bg-accent-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-primary">
              {openTasks.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-primary/90"
        >
          Add Task
        </button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 rounded-lg bg-status-red/10 p-2.5 text-xs text-status-red">
            {error}
          </div>
        )}

        {/* New task form */}
        {showForm && (
          <div className="mb-4 rounded-md border border-accent-primary/20 bg-surface-secondary p-3 space-y-2">
            <input
              ref={inputRef}
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="What needs to get done?"
              className="w-full rounded border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  createTask();
                }
                if (e.key === 'Escape') {
                  setShowForm(false);
                  setNewDesc('');
                  setNewDate('');
                }
              }}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                  Due
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={today}
                  className="rounded border border-border-primary bg-surface-primary px-2 py-1 text-xs text-text-primary focus:border-accent-primary focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setNewDesc('');
                    setNewDate('');
                  }}
                  className="rounded px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:bg-surface-tertiary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createTask}
                  disabled={creating || !newDesc.trim()}
                  className="rounded bg-accent-primary px-2.5 py-1 text-[11px] font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50 transition-colors"
                >
                  {creating ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task list */}
        {loading ? (
          <p className="text-sm text-text-muted text-center py-4">Loading...</p>
        ) : openTasks.length === 0 && doneTasks.length === 0 && !showForm ? (
          <div className="rounded-lg bg-surface-tertiary p-6 text-center">
            <p className="text-sm text-text-muted">
              No tasks yet. Add one to track your action items.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {openTasks.map((task) => (
              <TaskRow
                key={task.task_id}
                task={task}
                today={today}
                isEditing={editingId === task.task_id}
                editDesc={editDesc}
                editDate={editDate}
                saving={saving}
                onToggle={() => toggleDone(task)}
                onStartEdit={() => startEdit(task)}
                onSaveEdit={saveEdit}
                onCancelEdit={() => setEditingId(null)}
                onDelete={() => deleteTask(task.task_id)}
                onEditDescChange={setEditDesc}
                onEditDateChange={setEditDate}
              />
            ))}

            {/* Done tasks toggle */}
            {doneTasks.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowDone(!showDone)}
                  className="flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-text-secondary transition-colors"
                >
                  <svg
                    className={`h-3 w-3 transition-transform ${showDone ? 'rotate-90' : ''}`}
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M4 2l4 4-4 4" />
                  </svg>
                  {doneTasks.length} completed
                </button>
                {showDone && (
                  <div className="mt-1 space-y-0.5">
                    {doneTasks.map((task) => (
                      <TaskRow
                        key={task.task_id}
                        task={task}
                        today={today}
                        isEditing={false}
                        editDesc=""
                        editDate=""
                        saving={false}
                        onToggle={() => toggleDone(task)}
                        onStartEdit={() => {}}
                        onSaveEdit={() => {}}
                        onCancelEdit={() => {}}
                        onDelete={() => deleteTask(task.task_id)}
                        onEditDescChange={() => {}}
                        onEditDateChange={() => {}}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Task Row ───────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  today: string;
  isEditing: boolean;
  editDesc: string;
  editDate: string;
  saving: boolean;
  onToggle: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onEditDescChange: (v: string) => void;
  onEditDateChange: (v: string) => void;
}

function TaskRow({
  task,
  today,
  isEditing,
  editDesc,
  editDate,
  saving,
  onToggle,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditDescChange,
  onEditDateChange,
}: TaskRowProps) {
  const isDone = task.status === 'done';
  const isOverdue = !isDone && task.due_date && task.due_date < today;

  if (isEditing) {
    return (
      <div className="rounded-md border border-accent-primary/20 bg-surface-secondary p-2.5 space-y-2">
        <input
          type="text"
          value={editDesc}
          onChange={(e) => onEditDescChange(e.target.value)}
          className="w-full rounded border border-border-primary bg-surface-primary px-2.5 py-1.5 text-xs text-text-primary focus:border-accent-primary focus:outline-none"
          maxLength={2000}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onSaveEdit(); }
            if (e.key === 'Escape') onCancelEdit();
          }}
        />
        <div className="flex items-center justify-between">
          <input
            type="date"
            value={editDate}
            onChange={(e) => onEditDateChange(e.target.value)}
            className="rounded border border-border-primary bg-surface-primary px-2 py-1 text-xs text-text-primary focus:border-accent-primary focus:outline-none"
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={onCancelEdit}
              className="rounded px-2 py-1 text-[11px] font-medium text-text-secondary hover:bg-surface-tertiary"
            >
              Cancel
            </button>
            <button
              onClick={onSaveEdit}
              disabled={saving || !editDesc.trim()}
              className="rounded bg-accent-primary px-2 py-1 text-[11px] font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-tertiary border border-transparent ${
        isDone ? 'opacity-50' : ''
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`mt-0.5 shrink-0 h-4 w-4 rounded border transition-colors flex items-center justify-center ${
          isDone
            ? 'bg-status-green border-status-green'
            : 'border-border-primary hover:border-accent-primary'
        }`}
      >
        {isDone && (
          <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6l3 3 5-5" />
          </svg>
        )}
      </button>

      {/* Description + due date */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs leading-relaxed ${
            isDone ? 'line-through text-text-muted' : 'text-text-primary'
          }`}
        >
          {task.description}
        </p>
        {task.due_date && (
          <span
            className={`inline-flex items-center gap-0.5 mt-0.5 text-[10px] font-medium ${
              isOverdue
                ? 'text-status-red'
                : isDone
                ? 'text-text-muted'
                : 'text-text-secondary'
            }`}
          >
            <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6" cy="6" r="5" />
              <path d="M6 3v3l2 1" />
            </svg>
            {isOverdue ? 'Overdue: ' : ''}
            {task.due_date}
          </span>
        )}
      </div>

      {/* Hover actions */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isDone && (
          <button
            onClick={onStartEdit}
            className="rounded p-1 text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-colors"
            title="Edit"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 11.5V14h2.5l7.4-7.4-2.5-2.5L2 11.5z" />
              <path d="M11.9 1.6l2.5 2.5-1.3 1.3-2.5-2.5 1.3-1.3z" />
            </svg>
          </button>
        )}
        <button
          onClick={onDelete}
          className="rounded p-1 text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors"
          title="Delete"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
