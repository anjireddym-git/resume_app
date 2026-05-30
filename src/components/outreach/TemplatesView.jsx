import React, { useEffect, useState } from 'react';
import { Loader2, FileText, Plus, Trash2, Save, AlertTriangle, X } from 'lucide-react';
import {
  listEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate,
} from '../../services/resumeService';

const TemplatesView = ({ user }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState({ name: '', subject: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true); setError('');
    try { setTemplates(await listEmailTemplates(user.uid)); }
    catch (err) { setError(err.message || 'Failed to load templates.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.uid]);

  const selectTemplate = (t) => {
    setSelectedId(t.id);
    setDraft({ name: t.name || '', subject: t.subject || '', body: t.body || '' });
    setDirty(false);
  };

  const handleNew = async () => {
    setError('');
    try {
      const id = await createEmailTemplate(user.uid, { name: 'Untitled template', subject: '', body: '' });
      await load();
      setSelectedId(id);
      setDraft({ name: 'Untitled template', subject: '', body: '' });
      setDirty(false);
    } catch (err) { setError(err.message); }
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true); setError('');
    try {
      await updateEmailTemplate(user.uid, selectedId, {
        name: draft.name.trim() || 'Untitled template',
        subject: draft.subject,
        body: draft.body,
      });
      await load();
      setDirty(false);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm('Delete this template?')) return;
    setError('');
    try {
      await deleteEmailTemplate(user.uid, selectedId);
      setSelectedId(null);
      setDraft({ name: '', subject: '', body: '' });
      await load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="h-full flex">
      {/* List */}
      <div className="w-72 border-r border-neutral-200 bg-white flex flex-col">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-900">Templates</h1>
          <button onClick={handleNew} className="h-8 w-8 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center" title="New template">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-400 mx-auto" /></div>
          ) : templates.length === 0 ? (
            <div className="p-6 text-center text-sm text-neutral-500">
              <FileText className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
              No templates yet. Create one to reuse across outreach emails.
            </div>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTemplate(t)}
                className={`w-full text-left px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 ${selectedId === t.id ? 'bg-blue-50' : ''}`}
              >
                <div className="text-sm font-medium text-neutral-900 truncate">{t.name}</div>
                <div className="text-xs text-neutral-500 truncate">{t.subject || '(no subject)'}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto bg-neutral-50">
        {!selectedId ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-400 p-8 text-center">
            <FileText className="w-12 h-12 mb-3" />
            <p className="text-sm">Select a template to edit, or create a new one.</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-6 lg:p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5" /> <span>{error}</span>
                <button onClick={() => setError('')} className="ml-auto text-red-500"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-neutral-600">Template name</label>
                <input
                  value={draft.name}
                  onChange={(e) => { setDraft({ ...draft, name: e.target.value }); setDirty(true); }}
                  className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600">Subject</label>
                <input
                  value={draft.subject}
                  onChange={(e) => { setDraft({ ...draft, subject: e.target.value }); setDirty(true); }}
                  className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600">Body</label>
                <textarea
                  value={draft.body}
                  onChange={(e) => { setDraft({ ...draft, body: e.target.value }); setDirty(true); }}
                  className="w-full h-64 p-3 text-sm border border-neutral-200 rounded-lg font-mono resize-none focus:outline-none focus:border-neutral-400"
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                <button onClick={handleDelete} className="h-9 px-3 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplatesView;
