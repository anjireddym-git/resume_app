import React, { useState } from 'react';
import { Type, Layout, Palette, AlignLeft, Sliders, ChevronDown, Check } from 'lucide-react';
import { THEME_OPTIONS } from '../config/themeConfig';

const ThemeEditor = ({ config, onChange }) => {
  const [activeTab, setActiveTab] = useState('global');

  const updateConfig = (section, key, value) => {
    onChange({
      ...config,
      [section]: {
        ...config[section],
        [key]: value
      }
    });
  };

  const tabs = [
    { id: 'global', label: 'Global', icon: Type },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'sections', label: 'Sections', icon: AlignLeft },
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-neutral-200">
      {/* Tabs */}
      <div className="flex border-b border-neutral-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-neutral-900 border-b-2 border-neutral-900'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* GLOBAL TAB */}
        {activeTab === 'global' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-900">Font Family</label>
              <div className="grid grid-cols-1 gap-2">
                {THEME_OPTIONS.fonts.map((font) => (
                  <button
                    key={font.value}
                    onClick={() => updateConfig('typography', 'fontFamily', font.value)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left ${
                      config.typography.fontFamily === font.value
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <span style={{ fontFamily: font.value }}>{font.label}</span>
                    {config.typography.fontFamily === font.value && (
                      <Check className="w-4 h-4 text-neutral-900" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-medium text-neutral-900">Base Font Size</label>
                <span className="text-xs text-neutral-500">{config.typography.fontSize}pt</span>
              </div>
              <input
                type="range"
                min="8"
                max="12"
                step="0.5"
                value={config.typography.fontSize}
                onChange={(e) => updateConfig('typography', 'fontSize', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

             <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-medium text-neutral-900">Line Height</label>
                <span className="text-xs text-neutral-500">{config.typography.lineHeight}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="2.0"
                step="0.1"
                value={config.typography.lineHeight}
                onChange={(e) => updateConfig('typography', 'lineHeight', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* LAYOUT TAB */}
        {activeTab === 'layout' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-900">Header Style</label>
              <div className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.headerLayouts.map((layout) => (
                  <button
                    key={layout.value}
                    onClick={() => updateConfig('header', 'layout', layout.value)}
                    className={`p-3 rounded-lg border text-center text-xs font-medium ${
                      config.header.layout === layout.value
                        ? 'border-neutral-900 bg-neutral-50 text-neutral-900'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    {layout.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-medium text-neutral-900">Page Padding</label>
                <span className="text-xs text-neutral-500">{config.spacing.pagePadding}pt</span>
              </div>
              <input
                type="range"
                min="20"
                max="60"
                step="4"
                value={config.spacing.pagePadding}
                onChange={(e) => updateConfig('spacing', 'pagePadding', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-medium text-neutral-900">Section Spacing</label>
                <span className="text-xs text-neutral-500">{config.spacing.sectionMargin}pt</span>
              </div>
              <input
                type="range"
                min="4"
                max="24"
                step="2"
                value={config.spacing.sectionMargin}
                onChange={(e) => updateConfig('spacing', 'sectionMargin', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* COLORS TAB */}
        {activeTab === 'colors' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-900">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.colors.accent}
                  onChange={(e) => updateConfig('colors', 'accent', e.target.value)}
                  className="w-10 h-10 rounded border-0 cursor-pointer"
                />
                <span className="text-sm text-neutral-600 uppercase">{config.colors.accent}</span>
              </div>
              <p className="text-xs text-neutral-500">Used for links, bullets, and graphical elements</p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-900">Primary Text</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.colors.text}
                  onChange={(e) => updateConfig('colors', 'text', e.target.value)}
                  className="w-10 h-10 rounded border-0 cursor-pointer"
                />
                <span className="text-sm text-neutral-600 uppercase">{config.colors.text}</span>
              </div>
            </div>
          </div>
        )}

        {/* SECTIONS TAB */}
        {activeTab === 'sections' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-900">Section Titles</label>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-neutral-600">Uppercase</span>
                <input
                  type="checkbox"
                  checked={config.sectionTitle.uppercase}
                  onChange={(e) => updateConfig('sectionTitle', 'uppercase', e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
              </div>

               <div className="flex items-center justify-between py-2">
                <span className="text-sm text-neutral-600">Bold</span>
                <input
                  type="checkbox"
                  checked={config.sectionTitle.bold}
                  onChange={(e) => updateConfig('sectionTitle', 'bold', e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs text-neutral-500">Border Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {THEME_OPTIONS.borders.map((border) => (
                    <button
                      key={border.value}
                      onClick={() => updateConfig('sectionTitle', 'border', border.value)}
                      className={`px-3 py-2 text-xs rounded border ${
                        config.sectionTitle.border === border.value
                          ? 'border-neutral-900 bg-neutral-50 text-neutral-900'
                          : 'border-neutral-200 text-neutral-600'
                      }`}
                    >
                      {border.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

             <div className="space-y-3 pt-4 border-t border-neutral-100">
              <label className="text-sm font-medium text-neutral-900">Content</label>
              
              <div className="space-y-2">
                <label className="text-xs text-neutral-500">Bullet Style</label>
                <div className="flex gap-2">
                  {THEME_OPTIONS.separators.map((sep) => (
                    <button
                      key={sep.value}
                      onClick={() => updateConfig('content', 'bulletStyle', sep.value)}
                      className={`w-10 h-10 flex items-center justify-center rounded border ${
                        config.content.bulletStyle === sep.value
                         ? 'border-neutral-900 bg-neutral-50 text-neutral-900'
                          : 'border-neutral-200 text-neutral-600'
                      }`}
                    >
                      {sep.label.split(' ')[1].replace(/[()]/g, '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThemeEditor;
