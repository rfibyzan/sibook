import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-outline-variant bg-surface-container-lowest gap-2">
      <p className="text-body-sm text-secondary text-[12px] sm:text-sm whitespace-nowrap">
        <span className="font-bold text-on-surface">{currentPage}</span> / <span className="font-bold text-on-surface">{totalPages}</span>
      </p>
      
      <div className="flex items-center gap-0.5 sm:gap-1">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="p-1.5 sm:p-2 flex items-center justify-center rounded-lg text-secondary hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="material-symbols-outlined text-[18px] sm:text-[20px]">chevron_left</span>
        </button>

        {/* Page numbers hidden on very small screens, shown on sm+ */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="w-8 flex justify-center text-secondary">...</span>
              ) : (
                <button
                  onClick={() => onPageChange(page as number)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-body-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Compact current page indicator for mobile */}
        <span className="sm:hidden px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-bold">
          {currentPage}
        </span>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="p-1.5 sm:p-2 flex items-center justify-center rounded-lg text-secondary hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="material-symbols-outlined text-[18px] sm:text-[20px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
