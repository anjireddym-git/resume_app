export const buildOutreachUserProfile = (user, settings = {}) => ({
  name: user?.displayName || user?.email || '',
  email: user?.email || '',
  tone: settings?.aiTone || 'professional',
  visaType: settings?.visaType || '',
});

export const buildOutreachUserContext = (settings = {}) => ({
  tone: settings?.aiTone || 'professional',
  visaType: settings?.visaType || '',
});
