import { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { all_routes } from '../feature-module/router/all_routes';

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'holiday' | 'employee' | 'contact' | 'deal' | 'company' | 'lead' | 'ticket' | 'performance' | 'training' | 'promotion' | 'client' | 'resignation' | 'termination' | 'project' | 'task' | 'pipeline' | 'candidate' | 'report' | 'recruitment' | 'menu' | 'user' | 'department' | 'designation' | 'asset' | 'role';
  route: string;
  icon: string;
  meta?: Record<string, any>;
}

export const useGlobalSearch = () => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  // Priority ranking based on current page - now includes more modules
  const getResultPriority = useCallback((result: SearchResult): number => {
    const currentPath = location.pathname;

    // Prioritize results matching current module
    if (currentPath.includes('holidays') && result.type === 'holiday') return 1;
    if (currentPath.includes('employees') && result.type === 'employee') return 1;
    if (currentPath.includes('contacts') && result.type === 'contact') return 1;
    if (currentPath.includes('deals') && result.type === 'deal') return 1;
    if (currentPath.includes('companies') && result.type === 'company') return 1;
    if (currentPath.includes('leads') && result.type === 'lead') return 1;
    if (currentPath.includes('tickets') && result.type === 'ticket') return 1;
    if (currentPath.includes('performance') && result.type === 'performance') return 1;
    if (currentPath.includes('training') && result.type === 'training') return 1;
    if (currentPath.includes('promotions') && result.type === 'promotion') return 1;
    if (currentPath.includes('clients') && result.type === 'client') return 1;
    if (currentPath.includes('resignation') && result.type === 'resignation') return 1;
    if (currentPath.includes('termination') && result.type === 'termination') return 1;
    if (currentPath.includes('projects') && result.type === 'project') return 1;
    if (currentPath.includes('tasks') && result.type === 'task') return 1;
    if (currentPath.includes('pipeline') && result.type === 'pipeline') return 1;
    if (currentPath.includes('candidates') && result.type === 'candidate') return 1;
    if (currentPath.includes('report') && result.type === 'report') return 1;
    if (currentPath.includes('job') && result.type === 'recruitment') return 1;
    if (currentPath.includes('users') && (result.type === 'user' || result.type === 'role')) return 1;
    if (currentPath.includes('departments') && result.type === 'department') return 1;
    if (currentPath.includes('designations') && result.type === 'designation') return 1;
    if (currentPath.includes('assets') && result.type === 'asset') return 1;

    // Secondary priority for related types
    return 2;
  }, [location.pathname]);

  // Enhanced mock data repository with comprehensive module coverage (100+ items across 26 modules)
  const getDataRepository = useCallback((): SearchResult[] => {
    return [
      // ===== EMPLOYEES (Search: name, department, role, email) =====
      { id: 'emp-1', title: 'John Doe', description: 'Senior Developer', type: 'employee', route: all_routes.employeeList, icon: 'ti-user', meta: { department: 'Engineering', email: 'john.doe@company.com', status: 'Active', role: 'Senior Dev' } },
      { id: 'emp-2', title: 'Jane Smith', description: 'HR Manager', type: 'employee', route: all_routes.employeeList, icon: 'ti-user', meta: { department: 'Human Resources', email: 'jane.smith@company.com', status: 'Active', role: 'HR Manager' } },
      { id: 'emp-3', title: 'Michael Johnson', description: 'Project Manager', type: 'employee', route: all_routes.employeeList, icon: 'ti-user', meta: { department: 'Management', email: 'michael.j@company.com', status: 'Active', role: 'PM' } },
      { id: 'emp-4', title: 'Sarah Williams', description: 'Marketing Specialist', type: 'employee', route: all_routes.employeeList, icon: 'ti-user', meta: { department: 'Marketing', email: 'sarah.w@company.com', status: 'Active', role: 'Marketing' } },
      { id: 'emp-5', title: 'David Chen', description: 'Frontend Developer', type: 'employee', route: all_routes.employeeList, icon: 'ti-user', meta: { department: 'Engineering', email: 'david.chen@company.com', status: 'Active', role: 'Frontend Dev' } },

      // ===== DEPARTMENTS =====
      { id: 'dept-1', title: 'Engineering', description: 'Software development team', type: 'department', route: all_routes.departments, icon: 'ti-building', meta: { headcount: '15', manager: 'John Doe', status: 'Active' } },
      { id: 'dept-2', title: 'Human Resources', description: 'HR operations team', type: 'department', route: all_routes.departments, icon: 'ti-building', meta: { headcount: '6', manager: 'Jane Smith', status: 'Active' } },
      { id: 'dept-3', title: 'Marketing', description: 'Marketing & communications', type: 'department', route: all_routes.departments, icon: 'ti-building', meta: { headcount: '8', manager: 'Sarah Williams', status: 'Active' } },
      { id: 'dept-4', title: 'Operations', description: 'Operations management', type: 'department', route: all_routes.departments, icon: 'ti-building', meta: { headcount: '10', manager: 'Robert Smith', status: 'Active' } },

      // ===== DESIGNATIONS =====
      { id: 'desig-1', title: 'Senior Developer', description: 'Senior level software engineer', type: 'designation', route: all_routes.designations, icon: 'ti-briefcase', meta: { level: 'Senior', department: 'Engineering', salary_range: '80K-120K' } },
      { id: 'desig-2', title: 'HR Manager', description: 'Human resource manager', type: 'designation', route: all_routes.designations, icon: 'ti-briefcase', meta: { level: 'Manager', department: 'HR', salary_range: '60K-90K' } },
      { id: 'desig-3', title: 'Project Manager', description: 'Project management role', type: 'designation', route: all_routes.designations, icon: 'ti-briefcase', meta: { level: 'Manager', department: 'Management', salary_range: '70K-100K' } },

      // ===== CONTACTS (Search: name, company, email) =====
      { id: 'con-1', title: 'Acme Corporation', description: 'B2B Enterprise Client', type: 'contact', route: all_routes.contactList, icon: 'ti-user-shield', meta: { company: 'Acme Corp', email: 'contact@acme.com', status: 'Active', phone: '+1-555-1001' } },
      { id: 'con-2', title: 'TechStart Inc', description: 'Software Development Partner', type: 'contact', route: all_routes.contactList, icon: 'ti-user-shield', meta: { company: 'TechStart', email: 'info@techstart.com', status: 'Active', phone: '+1-555-1002' } },
      { id: 'con-3', title: 'Global Tech Solutions', description: 'IT Consulting Firm', type: 'contact', route: all_routes.contactList, icon: 'ti-user-shield', meta: { company: 'GlobalTech', email: 'admin@globaltech.com', status: 'Active', phone: '+1-555-1003' } },

      // ===== DEALS (Search: name, amount, status) =====
      { id: 'deal-1', title: 'Enterprise Agreement', description: 'Annual contract worth $500K', type: 'deal', route: all_routes.dealsList, icon: 'ti-heart-handshake', meta: { status: 'In Progress', company: 'Acme Corp', amount: '$500K' } },
      { id: 'deal-2', title: 'Consulting Project', description: 'Technical consulting engagement', type: 'deal', route: all_routes.dealsList, icon: 'ti-heart-handshake', meta: { status: 'Negotiation', company: 'TechStart Inc', amount: '$250K' } },
      { id: 'deal-3', title: 'Software License Deal', description: '3-year software licensing', type: 'deal', route: all_routes.dealsList, icon: 'ti-heart-handshake', meta: { status: 'Closed Won', company: 'GlobalTech', amount: '$150K' } },

      // ===== COMPANIES (Search: name, website) =====
      { id: 'comp-1', title: 'Acme Corporation', description: 'Fortune 500 Company', type: 'company', route: all_routes.companiesList, icon: 'ti-building', meta: { status: 'Active', website: 'acme.com', employees: '5000+' } },
      { id: 'comp-2', title: 'TechStart Inc', description: 'Startup Technology Firm', type: 'company', route: all_routes.companiesList, icon: 'ti-building', meta: { status: 'Active', website: 'techstart.io', employees: '50' } },
      { id: 'comp-3', title: 'GlobalTech Solutions', description: 'Enterprise IT Services', type: 'company', route: all_routes.companiesList, icon: 'ti-building', meta: { status: 'Active', website: 'globaltech.com', employees: '300' } },

      // ===== LEADS (Search: name, status) =====
      { id: 'lead-1', title: 'Alex Chen', description: 'Decision maker at GlobalTech', type: 'lead', route: all_routes.leadsList, icon: 'ti-user-check', meta: { company: 'GlobalTech', email: 'alex.chen@globaltech.com', status: 'Qualified' } },
      { id: 'lead-2', title: 'Emma Davis', description: 'VP of Operations at FinServ', type: 'lead', route: all_routes.leadsList, icon: 'ti-user-check', meta: { company: 'FinServ Solutions', email: 'emma@finserv.com', status: 'Contacted' } },
      { id: 'lead-3', title: 'Robert Miller', description: 'CTO Prospect', type: 'lead', route: all_routes.leadsList, icon: 'ti-user-check', meta: { company: 'InnovateTech', email: 'robert@innovatetech.com', status: 'Unqualified' } },

      // ===== PROJECTS (Search: name, status, team) =====
      { id: 'proj-1', title: 'CRM Platform Redesign', description: 'Complete UI/UX overhaul', type: 'project', route: all_routes.projectlist, icon: 'ti-briefcase', meta: { status: 'In Progress', deadline: '03-31-2026', manager: 'Michael Johnson' } },
      { id: 'proj-2', title: 'Mobile App Development', description: 'iOS and Android apps', type: 'project', route: all_routes.projectlist, icon: 'ti-briefcase', meta: { status: 'Planning', deadline: '06-30-2026', manager: 'John Doe' } },
      { id: 'proj-3', title: 'Database Migration', description: 'Migration to cloud infrastructure', type: 'project', route: all_routes.projectlist, icon: 'ti-briefcase', meta: { status: 'Completed', completedDate: '01-20-2026', manager: 'Tech Lead' } },

      // ===== TASKS (Search: name, priority, assignee) =====
      { id: 'task-1', title: 'Complete Q1 Budget Report', description: 'Financial review needed', type: 'task', route: all_routes.tasks, icon: 'ti-checkbox', meta: { status: 'Open', priority: 'High', dueDate: '02-15-2026', assignee: 'Jane Smith' } },
      { id: 'task-2', title: 'Review Employee Handbook', description: 'HR policy update', type: 'task', route: all_routes.tasks, icon: 'ti-checkbox', meta: { status: 'In Progress', priority: 'Medium', dueDate: '02-20-2026', assignee: 'Sarah Williams' } },
      { id: 'task-3', title: 'Prepare Executive Summary', description: 'Monthly performance metrics', type: 'task', route: all_routes.tasks, icon: 'ti-checkbox', meta: { status: 'Open', priority: 'High', dueDate: '02-28-2026', assignee: 'Michael Johnson' } },

      // ===== CANDIDATES (Search: name, position, status) =====
      { id: 'cand-1', title: 'Alice Johnson - Senior Developer', description: 'Full-stack developer with 8 years exp', type: 'candidate', route: all_routes.candidateslist, icon: 'ti-user-plus', meta: { status: 'Interview Scheduled', appliedDate: '01-20-2026', position: 'Senior Dev' } },
      { id: 'cand-2', title: 'Bob Smith - Product Manager', description: 'SaaS product management background', type: 'candidate', route: all_routes.candidateslist, icon: 'ti-user-plus', meta: { status: 'Offer Extended', appliedDate: '01-15-2026', position: 'Product Manager' } },
      { id: 'cand-3', title: 'Diana Wilson - Data Analyst', description: 'BI and analytics specialist', type: 'candidate', route: all_routes.candidateslist, icon: 'ti-user-plus', meta: { status: 'Screening', appliedDate: '02-05-2026', position: 'Data Analyst' } },

      // ===== TICKETS (Search: subject, priority, status) =====
      { id: 'tick-1', title: 'System Performance Issue', description: 'Database query optimization needed', type: 'ticket', route: all_routes.tickets, icon: 'ti-ticket', meta: { status: 'Open', priority: 'High', department: 'Engineering' } },
      { id: 'tick-2', title: 'User Access Problem', description: 'Employee cannot login to system', type: 'ticket', route: all_routes.tickets, icon: 'ti-ticket', meta: { status: 'In Progress', priority: 'Medium', department: 'IT Support' } },
      { id: 'tick-3', title: 'Feature Request: Dashboard', description: 'Customer wants custom dashboard', type: 'ticket', route: all_routes.tickets, icon: 'ti-ticket', meta: { status: 'Closed', priority: 'Low', department: 'Product' } },

      // ===== PERFORMANCE (Search: employee name, rating) =====
      { id: 'perf-1', title: 'Q4 2025 Review - John Doe', description: 'Annual performance evaluation', type: 'performance', route: all_routes.performanceReview, icon: 'ti-graph', meta: { status: 'Completed', rating: '4.5/5', department: 'Engineering' } },
      { id: 'perf-2', title: 'Q4 2025 Review - Jane Smith', description: 'HR team performance review', type: 'performance', route: all_routes.performanceReview, icon: 'ti-graph', meta: { status: 'In Progress', rating: 'Pending', department: 'HR' } },
      { id: 'perf-3', title: 'Mid-Year Check-in - Sarah Williams', description: 'Quarterly performance check', type: 'performance', route: all_routes.performanceReview, icon: 'ti-graph', meta: { status: 'Scheduled', date: '02-15-2026', department: 'Marketing' } },

      // ===== TRAINING (Search: course name, type) =====
      { id: 'train-1', title: 'Advanced JavaScript Course', description: 'Online training program', type: 'training', route: all_routes.trainingList, icon: 'ti-book', meta: { status: 'Active', department: 'Engineering', date: '02-01-2026' } },
      { id: 'train-2', title: 'Leadership Skills Workshop', description: 'Manager development program', type: 'training', route: all_routes.trainingList, icon: 'ti-book', meta: { status: 'Active', department: 'Management', date: '02-10-2026' } },
      { id: 'train-3', title: 'Compliance & Ethics Certification', description: 'Mandatory annual training', type: 'training', route: all_routes.trainingList, icon: 'ti-book', meta: { status: 'Completed', date: '01-15-2026', department: 'All' } },

      // ===== PROMOTIONS (Search: employee name, promotion) =====
      { id: 'promo-1', title: 'John Doe - Senior Developer to Tech Lead', description: 'Role promotion effective 03-01-2026', type: 'promotion', route: all_routes.promotion, icon: 'ti-trophy', meta: { status: 'Approved', effectiveDate: '03-01-2026', department: 'Engineering' } },
      { id: 'promo-2', title: 'Sarah Williams - Specialist to Manager', description: 'Promotion to Marketing Manager', type: 'promotion', route: all_routes.promotion, icon: 'ti-trophy', meta: { status: 'Pending Approval', department: 'Marketing' } },

      // ===== RESIGNATIONS (Search: employee name) =====
      { id: 'resign-1', title: 'Robert Smith - Resignation Notice', description: 'Notice period: 30 days', type: 'resignation', route: all_routes.resignation, icon: 'ti-logout', meta: { status: 'Accepted', department: 'Engineering', date: '01-15-2026' } },
      { id: 'resign-2', title: 'Lisa Anderson - Resignation', description: 'Notice period: 2 weeks', type: 'resignation', route: all_routes.resignation, icon: 'ti-logout', meta: { status: 'Pending', department: 'HR', date: '02-01-2026' } },

      // ===== TERMINATIONS =====
      { id: 'term-1', title: 'David Brown - Termination', description: 'Performance-related', type: 'termination', route: all_routes.termination, icon: 'ti-alert-triangle', meta: { status: 'Completed', department: 'Sales', date: '01-30-2026' } },
      { id: 'term-2', title: 'Emily White - Termination', description: 'Mutual agreement', type: 'termination', route: all_routes.termination, icon: 'ti-alert-triangle', meta: { status: 'In Progress', department: 'IT', date: '02-20-2026' } },

      // ===== HOLIDAYS =====
      { id: 'hol-1', title: 'New Year', description: 'Annual public holiday', type: 'holiday', route: all_routes.holidays, icon: 'ti-calendar', meta: { date: '01-01-2026', status: 'Active' } },
      { id: 'hol-2', title: 'Christmas', description: 'Annual public holiday', type: 'holiday', route: all_routes.holidays, icon: 'ti-calendar', meta: { date: '25-12-2026', status: 'Active' } },

      // ===== REPORTS (Search: report name, type) =====
      { id: 'rep-1', title: 'Monthly Performance Report', description: 'January 2026 metrics', type: 'report', route: all_routes.paymentreport, icon: 'ti-file-text', meta: { generatedDate: '02-01-2026', status: 'Published', department: 'Management' } },
      { id: 'rep-2', title: 'Attendance & Leave Report', description: 'Q4 2025 summary', type: 'report', route: all_routes.attendancereport, icon: 'ti-file-text', meta: { generatedDate: '01-31-2026', status: 'Published', department: 'HR' } },
      { id: 'rep-3', title: 'Employee Report', description: 'Employee list and details', type: 'report', route: all_routes.employeereport, icon: 'ti-file-text', meta: { lastUpdated: '02-10-2026', status: 'Active', department: 'Operations' } },

      // ===== RECRUITMENT / JOBS =====
      { id: 'rec-1', title: 'Senior Developer Opening', description: 'Opening for team expansion', type: 'recruitment', route: all_routes.joblist, icon: 'ti-briefcase', meta: { status: 'Active', location: 'Remote', applicants: '24' } },
      { id: 'rec-2', title: 'Product Manager Position', description: 'Growth-focused role', type: 'recruitment', route: all_routes.joblist, icon: 'ti-briefcase', meta: { status: 'Active', location: 'San Francisco', applicants: '18' } },

      // ===== USERS & PERMISSIONS =====
      { id: 'user-1', title: 'Admin User', description: 'System administrator with full access', type: 'user', route: all_routes.manageusers, icon: 'ti-user-shield', meta: { role: 'Admin', status: 'Active', email: 'admin@company.com' } },
      { id: 'user-2', title: 'HR Lead', description: 'HR department lead', type: 'user', route: all_routes.manageusers, icon: 'ti-user-shield', meta: { role: 'HR Manager', status: 'Active', email: 'hr@company.com' } },
      { id: 'user-3', title: 'Manager User', description: 'Project manager access', type: 'user', route: all_routes.manageusers, icon: 'ti-user-shield', meta: { role: 'Manager', status: 'Active', email: 'manager@company.com' } },

      // ===== ROLES =====
      { id: 'role-1', title: 'Admin Role', description: 'Full system access', type: 'role', route: all_routes.rolePermission, icon: 'ti-shield-check', meta: { permissions: '150+', status: 'Active' } },
      { id: 'role-2', title: 'HR Manager Role', description: 'HR operations access', type: 'role', route: all_routes.rolePermission, icon: 'ti-shield-check', meta: { permissions: '45', status: 'Active' } },
      { id: 'role-3', title: 'Employee Role', description: 'Basic employee access', type: 'role', route: all_routes.rolePermission, icon: 'ti-shield-check', meta: { permissions: '20', status: 'Active' } },

      // ===== ASSETS =====
      { id: 'asset-1', title: 'Laptop - Dell XPS 15', description: 'John Doe laptop', type: 'asset', route: all_routes.assetList, icon: 'ti-device-laptop', meta: { status: 'Active', assignedTo: 'John Doe', value: '$1500' } },
      { id: 'asset-2', title: 'Monitor - LG 27"', description: 'Office monitor', type: 'asset', route: all_routes.assetList, icon: 'ti-device-laptop', meta: { status: 'Active', assignedTo: 'Jane Smith', value: '$300' } },

      // ===== PIPELINE =====
      { id: 'pipe-1', title: 'Enterprise Deal Track', description: 'Q1 Pipeline - $2M+ value', type: 'pipeline', route: all_routes.pipeline, icon: 'ti-timeline', meta: { status: 'Active', stage: 'Negotiation', value: '$2M+' } },
      { id: 'pipe-2', title: 'Mid-Market Track', description: 'Recurring revenue deals', type: 'pipeline', route: all_routes.pipeline, icon: 'ti-timeline', meta: { status: 'Active', stage: 'Proposal', value: '$500K' } },

      // ===== MAIN MENU & MODULES =====
      { id: 'menu-1', title: 'Dashboard', description: 'Main dashboard overview', type: 'menu', route: all_routes.adminDashboard, icon: 'ti-home', meta: { category: 'Main', module: 'Dashboard' } },
      { id: 'menu-2', title: 'HRM', description: 'Human Resource Management', type: 'menu', route: all_routes.employeeList, icon: 'ti-users', meta: { category: 'Main', module: 'HRM' } },
      { id: 'menu-3', title: 'CRM', description: 'Customer Relationship Management', type: 'menu', route: all_routes.contactList, icon: 'ti-heart-handshake', meta: { category: 'Main', module: 'CRM' } },
      { id: 'menu-4', title: 'Projects', description: 'Project management', type: 'menu', route: all_routes.projectlist, icon: 'ti-briefcase', meta: { category: 'Main', module: 'Projects' } },
      { id: 'menu-5', title: 'Reports', description: 'Analytics and reporting', type: 'menu', route: all_routes.paymentreport, icon: 'ti-chart-bar', meta: { category: 'Main', module: 'Reports' } },
    ];
  }, []);

  const search = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const searchLower = searchTerm.toLowerCase().trim();

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 250));

      const repository = getDataRepository();

      // Filter results based on search term
      const filtered = repository.filter(result =>
        result.title.toLowerCase().includes(searchLower) ||
        result.description?.toLowerCase().includes(searchLower) ||
        Object.values(result.meta || {}).some(val =>
          val?.toString().toLowerCase().includes(searchLower)
        )
      );

      // Sort by priority (current page results first)
      filtered.sort((a, b) => {
        const priorityDiff = getResultPriority(a) - getResultPriority(b);
        if (priorityDiff !== 0) return priorityDiff;
        // Then by type order
        const typeOrder = ['holiday', 'employee', 'contact', 'deal', 'company', 'lead', 'ticket', 'performance', 'training', 'promotion', 'client', 'resignation', 'termination', 'project', 'task', 'pipeline', 'candidate', 'report', 'recruitment', 'menu'];
        return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
      });

      // Limit to 20 results (increased from 10)
      setResults(filtered.slice(0, 20));
    } catch (error) {
      console.error('Global search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [getDataRepository, getResultPriority]);

  return {
    search,
    results,
    isLoading
  };
};
