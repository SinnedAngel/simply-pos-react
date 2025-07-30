
import React from 'react';

export const ScaleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M16 16.5l4-4-4-4"></path>
    <path d="M8 8.5l-4 4 4 4"></path>
    <path d="M4 12.5h16"></path>
    <path d="M12 22V2"></path>
  </svg>
);
