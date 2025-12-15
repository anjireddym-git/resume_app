import React, { useState } from 'react';
import { 
  Type, Layout, Palette, AlignLeft, Sliders, Check, 
  Sparkles, Briefcase, Crown, Minus, Code, GraduationCap, 
  FileText, ChevronDown, ChevronRight, RotateCcw, Zap
} from 'lucide-react';
import { THEME_OPTIONS, THEME_PRESETS, DENSITY_PRESETS, DEFAULT_THEME_CONFIG } from '../config/themeConfig';

// Icon mapping for presets
const PRESET_ICONS = {
  Briefcase,
  Crown,
  Sparkles,
  Minus,
  Palette: Sparkles,
  GraduationCap,
  Code,
  FileText,
};

// Collapsible Section Component
const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-neutral-500" />}
          <span className="text-sm font-medium text-neutral-700">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-neutral-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        )}
      </button>
      {isOpen && (
        <div className="p-3 space-y-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
};

// Toggle Switch Component
const ToggleSwitch = ({ checked, onChange, label }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-sm text-neutral-600">{label}</span>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        checked ? 'bg-neutral-900' : 'bg-neutral-300'
      }`}
    >
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0.5'
      }`} />
    </button>
  </div>
);

// Slider Component
const SliderControl = ({ label, value, onChange, min, max, step = 1, unit = '' }) => (
  <div className="space-y-2">
    <div className="flex justify-between">
      <label className="text-sm text-neutral-600">{label}</label>
      <span className="text-xs text-neutral-500 font-mono">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-neutral-900"
    />
  </div>
);

// Color Picker Component
const ColorPicker = ({ label, value, onChange, description }) => (
  <div className="space-y-1">
    <label className="text-sm text-neutral-600">{label}</label>
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded border-0 cursor-pointer"
      />
      <span className="text-xs text-neutral-500 uppercase font-mono">{value}</span>
    </div>
    {description && <p className="text-xs text-neutral-400">{description}</p>}
  </div>
);

// Option Button Grid
const OptionGrid = ({ options, value, onChange, columns = 3 }) => (
  <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`p-2 rounded-lg border text-center text-xs font-medium transition-all ${
          value === opt.value
            ? 'border-neutral-900 bg-neutral-900 text-white'
            : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
        }`}
        title={opt.description}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

// Bullet Style Selector
const BulletSelector = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`w-10 h-10 flex items-center justify-center rounded-lg border text-lg transition-all ${
          value === opt.value
            ? 'border-neutral-900 bg-neutral-900 text-white'
            : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
        }`}
        title={opt.label}
      >
        {opt.value}
      </button>
    ))}
  </div>
);

const ThemeEditor = ({ config, onChange }) => {
  const [activeTab, setActiveTab] = useState('presets');

  const updateConfig = (section, key, value) => {
    onChange({
      ...config,
      [section]: {
        ...config[section],
        [key]: value
      }
    });
  };

  const applyPreset = (presetKey) => {
    const preset = THEME_PRESETS[presetKey];
    if (preset) {
      // Deep merge preset config with defaults
      const newConfig = {
        ...DEFAULT_THEME_CONFIG,
        typography: { ...DEFAULT_THEME_CONFIG.typography, ...preset.config.typography },
        colors: { ...DEFAULT_THEME_CONFIG.colors, ...preset.config.colors },
        header: { ...DEFAULT_THEME_CONFIG.header, ...preset.config.header },
        sectionTitle: { ...DEFAULT_THEME_CONFIG.sectionTitle, ...preset.config.sectionTitle },
        content: { ...DEFAULT_THEME_CONFIG.content, ...preset.config.content },
        spacing: { ...DEFAULT_THEME_CONFIG.spacing },
        experience: { ...DEFAULT_THEME_CONFIG.experience },
        ats: { ...DEFAULT_THEME_CONFIG.ats },
      };
      onChange(newConfig);
    }
  };

  const applyDensity = (densityKey) => {
    const density = DENSITY_PRESETS[densityKey];
    if (density) {
      onChange({
        ...config,
        spacing: {
          ...config.spacing,
          pagePadding: density.pagePadding,
          sectionMargin: density.sectionMargin,
          itemMargin: density.itemMargin,
          density: densityKey,
        },
        typography: {
          ...config.typography,
          lineHeight: density.lineHeight,
          fontSize: density.fontSize,
        },
      });
    }
  };

  const tabs = [
    { id: 'presets', label: 'Presets', icon: Zap },
    { id: 'typography', label: 'Fonts', icon: Type },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'sections', label: 'Sections', icon: AlignLeft },
    { id: 'advanced', label: 'Advanced', icon: Sliders },
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-neutral-200">
      {/* Tabs */}
      <div className="flex border-b border-neutral-200 overflow-x-auto flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-neutral-900 border-b-2 border-neutral-900'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* PRESETS TAB */}
        {activeTab === 'presets' && (
          <div className="space-y-4">
            <p className="text-xs text-neutral-500">
              Quick-start with a professionally designed theme
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(THEME_PRESETS).map(([key, preset]) => {
                const IconComponent = PRESET_ICONS[preset.icon] || FileText;
                return (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className="flex flex-col items-start p-3 rounded-lg border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 transition-all text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <IconComponent className="w-4 h-4 text-neutral-600" />
                      <span className="text-sm font-medium text-neutral-800">{preset.name}</span>
                    </div>
                    <span className="text-xs text-neutral-500">{preset.description}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-neutral-100">
              <label className="text-sm font-medium text-neutral-700 mb-2 block">Content Density</label>
              <p className="text-xs text-neutral-500 mb-3">Adjust spacing to fit more or less content</p>
              <OptionGrid 
                options={THEME_OPTIONS.densities}
                value={config.spacing?.density || 'balanced'}
                onChange={applyDensity}
                columns={4}
              />
            </div>
          </div>
        )}

        {/* TYPOGRAPHY TAB */}
        {activeTab === 'typography' && (
          <div className="space-y-4">
            <CollapsibleSection title="Font Family" icon={Type}>
              <div className="grid grid-cols-1 gap-2">
                {THEME_OPTIONS.fonts.map((font) => (
                  <button
                    key={font.value}
                    onClick={() => updateConfig('typography', 'fontFamily', font.value)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                      config.typography?.fontFamily === font.value
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <span className="text-sm" style={{ fontFamily: font.value.includes('Times') ? 'Times New Roman' : font.value }}>
                      {font.label}
                    </span>
                    {config.typography?.fontFamily === font.value && (
                      <Check className="w-4 h-4 text-neutral-900" />
                    )}
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Font Sizing" icon={Type}>
              <SliderControl
                label="Base Font Size"
                value={config.typography?.fontSize || 10}
                onChange={(v) => updateConfig('typography', 'fontSize', v)}
                min={8}
                max={12}
                step={0.5}
                unit="pt"
              />
              <SliderControl
                label="Line Height"
                value={config.typography?.lineHeight || 1.4}
                onChange={(v) => updateConfig('typography', 'lineHeight', v)}
                min={1.0}
                max={2.0}
                step={0.1}
              />
              <SliderControl
                label="Name Size Scale"
                value={config.typography?.nameScale || 2.2}
                onChange={(v) => updateConfig('typography', 'nameScale', v)}
                min={1.5}
                max={3.0}
                step={0.1}
                unit="x"
              />
              <SliderControl
                label="Section Title Scale"
                value={config.typography?.headingScale || 1.2}
                onChange={(v) => updateConfig('typography', 'headingScale', v)}
                min={1.0}
                max={1.8}
                step={0.1}
                unit="x"
              />
            </CollapsibleSection>
          </div>
        )}

        {/* LAYOUT TAB */}
        {activeTab === 'layout' && (
          <div className="space-y-4">
            <CollapsibleSection title="Header Style" icon={Layout}>
              <label className="text-xs text-neutral-500 mb-2 block">Header Layout</label>
              <OptionGrid
                options={THEME_OPTIONS.headerLayouts}
                value={config.header?.layout || 'centered'}
                onChange={(v) => updateConfig('header', 'layout', v)}
                columns={3}
              />
              
              <div className="pt-3 space-y-2">
                <ToggleSwitch
                  label="Bold Name"
                  checked={config.header?.nameBold ?? true}
                  onChange={(v) => updateConfig('header', 'nameBold', v)}
                />
                <ToggleSwitch
                  label="Uppercase Name"
                  checked={config.header?.nameUppercase ?? false}
                  onChange={(v) => updateConfig('header', 'nameUppercase', v)}
                />
                <ToggleSwitch
                  label="Name Divider Line"
                  checked={config.header?.nameDivider ?? false}
                  onChange={(v) => updateConfig('header', 'nameDivider', v)}
                />
              </div>

              <SliderControl
                label="Name Letter Spacing"
                value={config.header?.nameLetterSpacing || 0}
                onChange={(v) => updateConfig('header', 'nameLetterSpacing', v)}
                min={0}
                max={4}
                step={0.5}
                unit="pt"
              />
            </CollapsibleSection>

            <CollapsibleSection title="Contact Info" icon={Layout}>
              <label className="text-xs text-neutral-500 mb-2 block">Separator Style</label>
              <OptionGrid
                options={THEME_OPTIONS.separators}
                value={config.header?.contactSeparator || '|'}
                onChange={(v) => updateConfig('header', 'contactSeparator', v)}
                columns={3}
              />

              <div className="pt-3">
                <label className="text-xs text-neutral-500 mb-2 block">Title Style</label>
                <OptionGrid
                  options={THEME_OPTIONS.titleStyles}
                  value={config.header?.titleStyle || 'normal'}
                  onChange={(v) => updateConfig('header', 'titleStyle', v)}
                  columns={3}
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Page Spacing" icon={Layout}>
              <SliderControl
                label="Page Padding"
                value={config.spacing?.pagePadding || 40}
                onChange={(v) => updateConfig('spacing', 'pagePadding', v)}
                min={20}
                max={60}
                step={4}
                unit="pt"
              />
              <SliderControl
                label="Section Spacing"
                value={config.spacing?.sectionMargin || 12}
                onChange={(v) => updateConfig('spacing', 'sectionMargin', v)}
                min={4}
                max={24}
                step={2}
                unit="pt"
              />
              <SliderControl
                label="Item Spacing"
                value={config.spacing?.itemMargin || 8}
                onChange={(v) => updateConfig('spacing', 'itemMargin', v)}
                min={2}
                max={16}
                step={1}
                unit="pt"
              />
            </CollapsibleSection>
          </div>
        )}

        {/* COLORS TAB */}
        {activeTab === 'colors' && (
          <div className="space-y-4">
            <CollapsibleSection title="Primary Colors" icon={Palette}>
              <ColorPicker
                label="Primary Text"
                value={config.colors?.text || '#1f2937'}
                onChange={(v) => updateConfig('colors', 'text', v)}
                description="Main body text color"
              />
              <ColorPicker
                label="Secondary Text"
                value={config.colors?.secondary || '#4b5563'}
                onChange={(v) => updateConfig('colors', 'secondary', v)}
                description="Dates, locations, subtitles"
              />
              <ColorPicker
                label="Accent Color"
                value={config.colors?.accent || '#2563eb'}
                onChange={(v) => updateConfig('colors', 'accent', v)}
                description="Links, bullets, highlights"
              />
            </CollapsibleSection>

            <CollapsibleSection title="Structural Colors" icon={Palette} defaultOpen={false}>
              <ColorPicker
                label="Border Color"
                value={config.colors?.border || '#e5e7eb'}
                onChange={(v) => updateConfig('colors', 'border', v)}
                description="Section dividers and lines"
              />
              <ColorPicker
                label="Section Title Color"
                value={config.colors?.sectionTitleColor || '#374151'}
                onChange={(v) => updateConfig('colors', 'sectionTitleColor', v)}
                description="Section heading color"
              />
            </CollapsibleSection>

            {/* Quick color presets */}
            <div className="pt-2">
              <label className="text-xs text-neutral-500 mb-2 block">Quick Color Schemes</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { name: 'Blue', accent: '#2563eb', text: '#1f2937' },
                  { name: 'Teal', accent: '#0891b2', text: '#0f172a' },
                  { name: 'Purple', accent: '#7c3aed', text: '#18181b' },
                  { name: 'Green', accent: '#059669', text: '#0f172a' },
                  { name: 'Orange', accent: '#ea580c', text: '#1c1917' },
                  { name: 'Mono', accent: '#27272a', text: '#27272a' },
                ].map((scheme) => (
                  <button
                    key={scheme.name}
                    onClick={() => {
                      updateConfig('colors', 'accent', scheme.accent);
                      updateConfig('colors', 'text', scheme.text);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-200 hover:border-neutral-400 text-xs"
                  >
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: scheme.accent }}
                    />
                    {scheme.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECTIONS TAB */}
        {activeTab === 'sections' && (
          <div className="space-y-4">
            <CollapsibleSection title="Section Titles" icon={AlignLeft}>
              <div className="space-y-2">
                <ToggleSwitch
                  label="Uppercase"
                  checked={config.sectionTitle?.uppercase ?? true}
                  onChange={(v) => updateConfig('sectionTitle', 'uppercase', v)}
                />
                <ToggleSwitch
                  label="Bold"
                  checked={config.sectionTitle?.bold ?? true}
                  onChange={(v) => updateConfig('sectionTitle', 'bold', v)}
                />
              </div>

              <div className="pt-3">
                <label className="text-xs text-neutral-500 mb-2 block">Alignment</label>
                <OptionGrid
                  options={THEME_OPTIONS.sectionAlignments}
                  value={config.sectionTitle?.align || 'left'}
                  onChange={(v) => updateConfig('sectionTitle', 'align', v)}
                  columns={2}
                />
              </div>

              <div className="pt-3">
                <label className="text-xs text-neutral-500 mb-2 block">Border Style</label>
                <OptionGrid
                  options={THEME_OPTIONS.borders}
                  value={config.sectionTitle?.border || 'bottom'}
                  onChange={(v) => updateConfig('sectionTitle', 'border', v)}
                  columns={2}
                />
              </div>

              <SliderControl
                label="Letter Spacing"
                value={config.sectionTitle?.letterSpacing || 1}
                onChange={(v) => updateConfig('sectionTitle', 'letterSpacing', v)}
                min={0}
                max={4}
                step={0.5}
                unit="pt"
              />
            </CollapsibleSection>

            <CollapsibleSection title="Bullet Points" icon={AlignLeft}>
              <label className="text-xs text-neutral-500 mb-2 block">Bullet Style</label>
              <BulletSelector
                options={THEME_OPTIONS.bulletStyles}
                value={config.content?.bulletStyle || '•'}
                onChange={(v) => updateConfig('content', 'bulletStyle', v)}
              />
            </CollapsibleSection>

            <CollapsibleSection title="Date Formatting" icon={AlignLeft}>
              <label className="text-xs text-neutral-500 mb-2 block">Date Format</label>
              <OptionGrid
                options={THEME_OPTIONS.dateFormats}
                value={config.content?.dateFormat || 'MMM YYYY'}
                onChange={(v) => updateConfig('content', 'dateFormat', v)}
                columns={2}
              />

              <div className="pt-3">
                <label className="text-xs text-neutral-500 mb-2 block">Date Position</label>
                <OptionGrid
                  options={[
                    { label: 'Right', value: 'right' },
                    { label: 'Below', value: 'below' },
                  ]}
                  value={config.content?.dateAlign || 'right'}
                  onChange={(v) => updateConfig('content', 'dateAlign', v)}
                  columns={2}
                />
              </div>
            </CollapsibleSection>
          </div>
        )}

        {/* ADVANCED TAB */}
        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <CollapsibleSection title="Experience Entries" icon={Sliders}>
              <label className="text-xs text-neutral-500 mb-2 block">Title Order</label>
              <OptionGrid
                options={THEME_OPTIONS.experienceStyles}
                value={config.experience?.titlePosition || 'position-first'}
                onChange={(v) => updateConfig('experience', 'titlePosition', v)}
                columns={1}
              />

              <div className="pt-3">
                <label className="text-xs text-neutral-500 mb-2 block">Location Display</label>
                <OptionGrid
                  options={THEME_OPTIONS.locationStyles}
                  value={config.experience?.locationPlacement || 'inline'}
                  onChange={(v) => updateConfig('experience', 'locationPlacement', v)}
                  columns={3}
                />
              </div>

              <div className="pt-3 space-y-2">
                <ToggleSwitch
                  label="Show Bullet Points"
                  checked={config.experience?.highlightBullets ?? true}
                  onChange={(v) => updateConfig('experience', 'highlightBullets', v)}
                />
                <ToggleSwitch
                  label="Show Location"
                  checked={config.content?.showLocation ?? true}
                  onChange={(v) => updateConfig('content', 'showLocation', v)}
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Skills Display" icon={Sliders} defaultOpen={false}>
              <label className="text-xs text-neutral-500 mb-2 block">Proficiency Style</label>
              <OptionGrid
                options={THEME_OPTIONS.skillProficiencyStyles}
                value={config.content?.skillProficiency || 'none'}
                onChange={(v) => updateConfig('content', 'skillProficiency', v)}
                columns={3}
              />
            </CollapsibleSection>

            <CollapsibleSection title="ATS Optimization" icon={Sliders} defaultOpen={false}>
              <p className="text-xs text-neutral-500 mb-3">
                Settings to maximize ATS (Applicant Tracking System) compatibility
              </p>
              <div className="space-y-2">
                <ToggleSwitch
                  label="Use Standard Section Names"
                  checked={config.ats?.useStandardSections ?? true}
                  onChange={(v) => updateConfig('ats', 'useStandardSections', v)}
                />
                <ToggleSwitch
                  label="Avoid Complex Graphics"
                  checked={config.ats?.avoidGraphics ?? true}
                  onChange={(v) => updateConfig('ats', 'avoidGraphics', v)}
                />
                <ToggleSwitch
                  label="Simple Layout"
                  checked={config.ats?.simpleLayout ?? true}
                  onChange={(v) => updateConfig('ats', 'simpleLayout', v)}
                />
              </div>
              
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-700">
                  ✓ Your current settings are ATS-friendly. The resume uses standard fonts, clear hierarchy, and parseable text.
                </p>
              </div>
            </CollapsibleSection>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThemeEditor;
