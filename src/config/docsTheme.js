// docsTheme.js
// Google Docs–native typography & layout constants.
// These tokens are used by the in-app preview (ClassicTemplate + section
// components) AND by the DOCX exporter so that the local preview, the rendered
// Google Doc, and the downloaded DOCX all look identical.
//
// All values mirror Google Docs' factory defaults unless noted.

export const docsTheme = {
  // Base typography — Docs default is Arial 11 with line-height 1.15
  fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
  fontSizePt: 11,
  lineHeight: 1.15,
  color: '#000000',
  linkColor: '#1155CC',

  // Page geometry — US Letter, 1" margins on all sides (Docs default)
  pageWidthIn: 8.5,
  pageHeightIn: 11,
  marginIn: 1,

  // Headings — Docs default sizes
  h1: { sizePt: 20, weight: 700, color: '#000000', marginTopPt: 20, marginBottomPt: 6 },
  h2: { sizePt: 16, weight: 700, color: '#000000', marginTopPt: 18, marginBottomPt: 6 },
  h3: { sizePt: 14, weight: 700, color: '#434343', marginTopPt: 16, marginBottomPt: 4 },

  // Section title (custom, similar to Heading 2 underlined)
  sectionTitle: {
    sizePt: 12,
    weight: 700,
    color: '#000000',
    letterSpacing: '0.04em',
    uppercase: true,
    underlineColor: '#000000',
    underlineWeight: 1,
    marginTopPt: 12,
    marginBottomPt: 6,
  },

  // Body paragraph spacing
  paragraphSpacingAfterPt: 4,

  // Bullets
  bulletIndentIn: 0.25,
  bulletGapPt: 6,
};

// Convert pt to CSS px (1pt = 1.333px @ 96dpi)
export const ptToPx = (pt) => `${(pt * 4) / 3}px`;
export const inToPx = (inches) => `${inches * 96}px`;

// Inline style helpers — keep components terse
export const docsStyles = {
  page: {
    width: inToPx(docsTheme.pageWidthIn),
    minHeight: inToPx(docsTheme.pageHeightIn),
    padding: inToPx(docsTheme.marginIn),
    margin: '0 auto',
    background: '#ffffff',
    boxShadow: '0 1px 3px rgba(60,64,67,0.15), 0 4px 8px rgba(60,64,67,0.15)',
    fontFamily: docsTheme.fontFamily,
    fontSize: ptToPx(docsTheme.fontSizePt),
    lineHeight: docsTheme.lineHeight,
    color: docsTheme.color,
  },
  body: {
    fontFamily: docsTheme.fontFamily,
    fontSize: ptToPx(docsTheme.fontSizePt),
    lineHeight: docsTheme.lineHeight,
    color: docsTheme.color,
  },
  sectionTitle: {
    fontSize: ptToPx(docsTheme.sectionTitle.sizePt),
    fontWeight: docsTheme.sectionTitle.weight,
    color: docsTheme.sectionTitle.color,
    letterSpacing: docsTheme.sectionTitle.letterSpacing,
    textTransform: docsTheme.sectionTitle.uppercase ? 'uppercase' : 'none',
    borderBottom: `${docsTheme.sectionTitle.underlineWeight}px solid ${docsTheme.sectionTitle.underlineColor}`,
    paddingBottom: '2px',
    marginTop: ptToPx(docsTheme.sectionTitle.marginTopPt),
    marginBottom: ptToPx(docsTheme.sectionTitle.marginBottomPt),
  },
  h1: {
    fontSize: ptToPx(docsTheme.h1.sizePt),
    fontWeight: docsTheme.h1.weight,
    color: docsTheme.h1.color,
    margin: 0,
    lineHeight: 1.2,
  },
  bulletList: {
    listStyleType: 'disc',
    paddingLeft: inToPx(docsTheme.bulletIndentIn),
    margin: `${ptToPx(docsTheme.paragraphSpacingAfterPt)} 0`,
  },
  bulletItem: {
    marginBottom: ptToPx(docsTheme.bulletGapPt - docsTheme.paragraphSpacingAfterPt > 0
      ? docsTheme.bulletGapPt - docsTheme.paragraphSpacingAfterPt
      : 2),
  },
  link: {
    color: docsTheme.linkColor,
    textDecoration: 'underline',
  },
};
