import React from 'react';

interface ProjectTimelineProps {
  startDate: string;
  strategyEndDate: string;
  directionStartDate: string;
  endDate: string;
  currentPhase: 'STRATEGY' | 'DIRECTION';
}

const ProjectTimeline: React.FC<ProjectTimelineProps> = ({ 
  startDate, 
  strategyEndDate, 
  directionStartDate, 
  endDate 
}) => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const strategyEnd = new Date(strategyEndDate).getTime();
  const today = new Date().getTime();
  
  const totalDuration = end - start;
  
  // Calculate widths as percentages
  const strategyWidth = ((strategyEnd - start) / totalDuration) * 100;
  const directionWidth = 100 - strategyWidth;
  
  // Calculate current progress position
  let progress = ((today - start) / totalDuration) * 100;
  progress = Math.max(0, Math.min(100, progress)); // Clamp between 0 and 100

  // Date formatter
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full mt-4">
      {/* Labels */}
      <div className="flex justify-between text-[10px] uppercase font-semibold text-gray-400 mb-1.5 tracking-wider">
        <span>Strategy</span>
        <span className="text-right">Direction</span>
      </div>

      {/* Bar */}
      <div className="relative h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
        {/* Strategy Section */}
        <div 
          className="h-full bg-blue-100 border-r border-white" 
          style={{ width: `${strategyWidth}%` }} 
        />
        {/* Direction Section */}
        <div 
          className="h-full bg-purple-100" 
          style={{ width: `${directionWidth}%` }} 
        />
        
        {/* Progress Marker */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-gray-800 z-10 shadow-sm"
          style={{ left: `${progress}%` }}
        />
      </div>

      {/* Dates Footer */}
      <div className="flex justify-between text-[10px] text-gray-400 mt-1.5 font-mono">
        <span>{formatDate(startDate)}</span>
        <span style={{ marginLeft: `${strategyWidth - 10}%` }} className="hidden sm:inline-block text-gray-300">
           ◆ {formatDate(strategyEndDate)}
        </span>
        <span>{formatDate(endDate)}</span>
      </div>
    </div>
  );
};

export default ProjectTimeline;