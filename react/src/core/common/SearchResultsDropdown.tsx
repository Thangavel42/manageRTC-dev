import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchResult } from '../../hooks/useGlobalSearch';
import './SearchResultsDropdown.css';

interface SearchResultsDropdownProps {
  results: SearchResult[];
  isLoading: boolean;
  isOpen: boolean;
  searchTerm: string;
  onSelect?: (result: SearchResult) => void;
}

const SearchResultsDropdown: React.FC<SearchResultsDropdownProps> = ({
  results,
  isLoading,
  isOpen,
  searchTerm,
  onSelect
}) => {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const totalResults = results.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev === null ? 0 : Math.min(prev + 1, totalResults - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev === null ? totalResults - 1 : Math.max(prev - 1, 0)
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex !== null && results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedIndex(null);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  if (!isOpen || !searchTerm.trim()) {
    return null;
  }

  const handleResultClick = (result: SearchResult) => {
    navigate(result.route);
    onSelect?.(result);
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const getTypeLabel = (type: SearchResult['type']): string => {
    const labels: Record<SearchResult['type'], string> = {
      holiday: 'Holidays',
      employee: 'Employees',
      contact: 'Contacts',
      deal: 'Deals',
      company: 'Companies',
      lead: 'Leads',
      ticket: 'Tickets',
      performance: 'Performance',
      training: 'Training',
      promotion: 'Promotions',
      client: 'Clients',
      resignation: 'Resignations',
      termination: 'Terminations',
      project: 'Projects',
      task: 'Tasks',
      pipeline: 'Pipeline',
      candidate: 'Candidates',
      report: 'Reports',
      recruitment: 'Recruitment',
      menu: 'Main Menu',
      user: 'Users',
      department: 'Departments',
      designation: 'Designations',
      asset: 'Assets',
      role: 'Roles'
    };
    return labels[type];
  };

  const getTypeColor = (type: SearchResult['type']): string => {
    const colors: Record<SearchResult['type'], string> = {
      holiday: 'badge-soft-warning',
      employee: 'badge-soft-info',
      contact: 'badge-soft-primary',
      deal: 'badge-soft-success',
      company: 'badge-soft-secondary',
      lead: 'badge-soft-danger',
      ticket: 'badge-soft-primary',
      performance: 'badge-soft-info',
      training: 'badge-soft-warning',
      promotion: 'badge-soft-success',
      client: 'badge-soft-secondary',
      resignation: 'badge-soft-danger',
      termination: 'badge-soft-danger',
      project: 'badge-soft-primary',
      task: 'badge-soft-info',
      pipeline: 'badge-soft-success',
      candidate: 'badge-soft-warning',
      report: 'badge-soft-secondary',
      recruitment: 'badge-soft-primary',
      menu: 'badge-soft-info',
      user: 'badge-soft-warning',
      department: 'badge-soft-primary',
      designation: 'badge-soft-info',
      asset: 'badge-soft-secondary',
      role: 'badge-soft-info'
    };
    return colors[type];
  };

  // Calculate current result index for keyboard navigation
  let currentResultIndex = 0;

  return (
    <div className="search-results-dropdown">
      {isLoading && (
        <div className="search-results-loading">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <span className="ms-2">Searching...</span>
        </div>
      )}

      {!isLoading && results.length === 0 && searchTerm.trim() && (
        <div className="search-results-empty">
          <i className="ti ti-search"></i>
          <p>No results found for "{searchTerm}"</p>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className="search-results-list">
          {Object.entries(groupedResults).map(([type, typeResults]) => (
            <div key={type} className="search-results-group">
              <div className="search-results-group-header">
                <span className={`badge ${getTypeColor(type as SearchResult['type'])}`}>
                  {getTypeLabel(type as SearchResult['type'])}
                </span>
              </div>
              {typeResults.map((result) => {
                const isSelected = selectedIndex === currentResultIndex;
                const resultIndex = currentResultIndex++;
                return (
                  <div
                    key={result.id}
                    className={`search-result-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleResultClick(result)}
                    onMouseEnter={() => setSelectedIndex(resultIndex)}
                    onMouseLeave={() => setSelectedIndex(null)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="search-result-icon">
                      <i className={`ti ${result.icon}`}></i>
                    </div>
                    <div className="search-result-content">
                      <h6 className="search-result-title">{result.title}</h6>
                      {result.description && (
                        <p className="search-result-description">{result.description}</p>
                      )}
                      {result.meta && Object.keys(result.meta).length > 0 && (
                        <div className="search-result-meta">
                          {result.meta.date && (
                            <span className="meta-item">
                              <i className="ti ti-calendar me-1"></i>{result.meta.date}
                            </span>
                          )}
                          {result.meta.status && (
                            <span className="meta-item">
                              <i className="ti ti-check me-1"></i>{result.meta.status}
                            </span>
                          )}
                          {result.meta.department && (
                            <span className="meta-item">
                              <i className="ti ti-building me-1"></i>{result.meta.department}
                            </span>
                          )}
                          {result.meta.email && (
                            <span className="meta-item">
                              <i className="ti ti-mail me-1"></i>{result.meta.email}
                            </span>
                          )}
                          {result.meta.company && (
                            <span className="meta-item">
                              <i className="ti ti-building-skyscraper me-1"></i>{result.meta.company}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="search-result-action">
                      <i className="ti ti-arrow-right"></i>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResultsDropdown;
