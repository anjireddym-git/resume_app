import React, { useMemo, useState } from 'react';
import { X, Check } from 'lucide-react';
import LayoutPreservingTemplate from '../templates/LayoutPreservingTemplate';
import { buildLayoutConfig } from '../services/layoutExtractionService';
import {
  SECTION_HEADER_STYLES,
  HEADER_LAYOUTS,
  CONTACT_STYLES,
  COLUMN_OPTIONS,
} from '../config/layoutSchema';

/**
 * LayoutConfirmationModal
 * Shows a live preview of the auto-detected layout and lets the user
 * tweak the obvious controls (columns, header style, fonts, colors,
 * margins) before saving.
 *
 * Props:
 *   isOpen
 *   onClose
 *   detectedLayout    - partial layoutConfig from the cloud function
 *   resumeContent     - extracted resume content (for preview)
 *   customSectionDefs - [{id, title}]
 *   sectionOrder
 *   onConfirm(finalLayoutConfig)
 */
const LayoutConfirmationModal = ({
  isOpen,
  onClose,
  detectedLayout,
  resumeContent,
  customSectionDefs = [],
  sectionOrder,
  onConfirm,
}) => {
  const initial = useMemo(() => buildLayoutConfig(detectedLayout), [detectedLayout]);
  const [cfg, setCfg] = useState(initial);

  if (!isOpen) return null;

  const set = (patch) => setCfg(prev => buildLayoutConfig({ ...prev, ...patch }));
  const setFont = (key, patch) => setCfg(prev => buildLayoutConfig({
    ...prev,
    fonts: { ...prev.fonts, [key]: { ...prev.fonts[key], ...patch } },
  }));
  const setColor = (key, val) => setCfg(prev => buildLayoutConfig({
    ...prev,
    colors: { ...prev.colors, [key]: val },
  }));
  const setMargin = (side, val) => setCfg(prev => buildLayoutConfig({
    ...prev,
    pageMargins: { ...prev.pageMargins, [side]: Number(val) || 0 },
  }));
  const setHeader = (patch) => setCfg(prev => buildLayoutConfig({
    ...prev,
    header: { ...prev.header, ...patch },
  }));
  const setSectionHeader = (patch) => setCfg(prev => buildLayoutConfig({
    ...prev,
    sectionHeader: { ...prev.sectionHeader, ...patch },
  }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-7xl h-[92vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Confirm Resume Layout</h2>
            <p className="text-xs text-neutral-500">We auto-detected the layout from your file. Tweak as needed.</p>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex">
          {/* Tweak controls */}
          <div className="w-[360px] border-r border-neutral-200 overflow-y-auto p-4 space-y-5 text-sm">
            <Group title="Columns">
              <div className="flex gap-2">
                {COLUMN_OPTIONS.map(n => (
                  <button
                    key={n}
                    onClick={() => set({ columns: n })}
                    className={`flex-1 h-9 rounded-lg border text-sm ${cfg.columns === n ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-300 hover:bg-neutral-50'}`}
                  >{n}-col</button>
                ))}
              </div>
              {cfg.columns === 2 && (
                <Row label="Left column width">
                  <input
                    type="range" min="0.2" max="0.5" step="0.01"
                    value={cfg.columnSplit}
                    onChange={(e) => set({ columnSplit: Number(e.target.value) })}
                    className="w-full"
                  />
                  <span className="ml-2 text-xs text-neutral-500">{Math.round(cfg.columnSplit * 100)}%</span>
                </Row>
              )}
            </Group>

            <Group title="Header">
              <Row label="Layout">
                <select value={cfg.header.layout} onChange={(e) => setHeader({ layout: e.target.value })} className="select">
                  {HEADER_LAYOUTS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </Row>
              <Row label="Contact style">
                <select value={cfg.header.contactStyle} onChange={(e) => setHeader({ contactStyle: e.target.value })} className="select">
                  {CONTACT_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Row>
              <Row label="Show title">
                <input type="checkbox" checked={cfg.header.showTitle} onChange={(e) => setHeader({ showTitle: e.target.checked })} />
              </Row>
            </Group>

            <Group title="Section title style">
              <Row label="Style">
                <select value={cfg.sectionHeader.style} onChange={(e) => setSectionHeader({ style: e.target.value })} className="select">
                  {SECTION_HEADER_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Row>
              <Row label="Uppercase">
                <input type="checkbox" checked={cfg.sectionHeader.uppercase} onChange={(e) => setSectionHeader({ uppercase: e.target.checked })} />
              </Row>
            </Group>

            <Group title="Fonts">
              {['name', 'sectionHeader', 'body', 'dates'].map(key => (
                <div key={key} className="border border-neutral-200 rounded-lg p-2 space-y-1">
                  <div className="text-xs font-medium text-neutral-700 capitalize">{key}</div>
                  <div className="flex gap-2">
                    <select
                      value={cfg.fonts[key].family}
                      onChange={(e) => setFont(key, { family: e.target.value })}
                      className="select flex-1"
                    >
                      {['Helvetica', 'Arial', 'Times New Roman', 'Georgia', 'Courier', 'Verdana'].map(f => <option key={f}>{f}</option>)}
                    </select>
                    <input
                      type="number" min="6" max="48"
                      value={cfg.fonts[key].size}
                      onChange={(e) => setFont(key, { size: Number(e.target.value) || 10 })}
                      className="w-16 h-9 px-2 border border-neutral-300 rounded"
                    />
                    <input
                      type="color"
                      value={cfg.fonts[key].color || '#000000'}
                      onChange={(e) => setFont(key, { color: e.target.value })}
                      className="w-9 h-9 border border-neutral-300 rounded"
                    />
                  </div>
                </div>
              ))}
            </Group>

            <Group title="Colors">
              {['primary', 'text', 'muted', 'background', 'sidebarBg', 'divider'].map(k => (
                <Row key={k} label={k}>
                  <input
                    type="color"
                    value={cfg.colors[k] || '#000000'}
                    onChange={(e) => setColor(k, e.target.value)}
                  />
                  <span className="ml-2 text-xs text-neutral-500">{cfg.colors[k]}</span>
                </Row>
              ))}
            </Group>

            <Group title="Page margins (pt)">
              {['top', 'right', 'bottom', 'left'].map(side => (
                <Row key={side} label={side}>
                  <input
                    type="number" min="0" max="120"
                    value={cfg.pageMargins[side]}
                    onChange={(e) => setMargin(side, e.target.value)}
                    className="w-20 h-9 px-2 border border-neutral-300 rounded"
                  />
                </Row>
              ))}
            </Group>
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-auto bg-neutral-100 p-6 flex items-start justify-center">
            <div className="shadow-lg" style={{ transform: 'scale(0.75)', transformOrigin: 'top center' }}>
              <LayoutPreservingTemplate
                resumeData={resumeContent}
                layoutConfig={cfg}
                sectionOrder={sectionOrder}
                customSectionDefs={customSectionDefs}
                isEditMode={false}
              />
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-neutral-200 flex justify-between items-center">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900">
            Skip (use template instead)
          </button>
          <button
            onClick={() => onConfirm(cfg)}
            className="px-6 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            Confirm Layout <Check className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style>{`.select{height:36px;padding:0 8px;border:1px solid #d4d4d4;border-radius:6px;font-size:13px;background:#fff}`}</style>
    </div>
  );
};

function Group({ title, children }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-neutral-600 capitalize">{label}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

export default LayoutConfirmationModal;
