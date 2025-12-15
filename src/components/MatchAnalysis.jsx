import React from 'react';
import { TrendingUp, Check, AlertCircle, ArrowRight } from 'lucide-react';

const MatchAnalysis = ({ analysis, isLoading }) => {
  if (!analysis && !isLoading) return null;

  if (isLoading) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-neutral-200 rounded w-1/3 mb-3"></div>
          <div className="h-8 bg-neutral-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const score = analysis?.matchScore || 0;
  const careerGap = analysis?.careerGap || 'none';
  
  const getScoreColor = () => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-neutral-600';
  };

  const getGapBadge = () => {
    const styles = {
      none: 'bg-emerald-50 text-emerald-700',
      minor: 'bg-blue-50 text-blue-700',
      moderate: 'bg-amber-50 text-amber-700',
      major: 'bg-red-50 text-red-700',
    };
    const labels = {
      none: 'Perfect Fit',
      minor: 'Minor Gap',
      moderate: 'Career Pivot',
      major: 'Major Pivot',
    };
    return { style: styles[careerGap] || styles.none, label: labels[careerGap] || 'Unknown' };
  };

  const gapBadge = getGapBadge();

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
          Match Score
        </label>
        {careerGap && careerGap !== 'none' && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${gapBadge.style}`}>
            {gapBadge.label}
          </span>
        )}
      </div>
      
      <div className="flex items-baseline gap-1 mb-4">
        <span className={`text-3xl font-semibold ${getScoreColor()}`}>{score}</span>
        <span className="text-sm text-neutral-400">/ 100</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-4">
        <div 
          className={`h-full transition-all duration-500 ${
            score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-neutral-400'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Pivot Advice */}
      {analysis?.pivotAdvice && (careerGap === 'moderate' || careerGap === 'major') && (
        <div className="mb-3 p-2 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-xs text-amber-800">
            <ArrowRight className="w-3 h-3 inline mr-1" />
            {analysis.pivotAdvice}
          </p>
        </div>
      )}

      {/* Matched Skills */}
      {analysis?.matchedSkills?.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-neutral-500 mb-1.5">Matched</p>
          <div className="flex flex-wrap gap-1">
            {analysis.matchedSkills.slice(0, 6).map((skill, i) => (
              <span key={i} className="px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700 rounded">
                {skill}
              </span>
            ))}
            {analysis.matchedSkills.length > 6 && (
              <span className="px-2 py-0.5 text-xs text-neutral-500">
                +{analysis.matchedSkills.length - 6}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Missing Skills */}
      {analysis?.missingSkills?.length > 0 && (
        <div>
          <p className="text-xs text-neutral-500 mb-1.5">Missing</p>
          <div className="flex flex-wrap gap-1">
            {analysis.missingSkills.slice(0, 5).map((skill, i) => (
              <span key={i} className="px-2 py-0.5 text-xs bg-red-50 text-red-600 rounded">
                {skill}
              </span>
            ))}
            {analysis.missingSkills.length > 5 && (
              <span className="px-2 py-0.5 text-xs text-neutral-500">
                +{analysis.missingSkills.length - 5}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchAnalysis;
