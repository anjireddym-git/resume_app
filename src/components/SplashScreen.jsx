import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';

const SplashScreen = ({ onComplete }) => {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOpacity(0);
      setTimeout(onComplete, 300);
    }, 1200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className="fixed inset-0 bg-white flex items-center justify-center z-50 transition-opacity duration-300"
      style={{ opacity }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center">
          <FileText className="w-6 h-6 text-white" strokeWidth={1.5} />
        </div>
        <span className="text-lg font-medium text-neutral-900">Resume</span>
      </div>
    </div>
  );
};

export default SplashScreen;
