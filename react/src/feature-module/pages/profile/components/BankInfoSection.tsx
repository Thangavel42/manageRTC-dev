/**
 * Bank Information Section Component
 * Displays and edits bank information: Bank Name, Account Number, IFSC Code, Branch, Account Type
 * Includes account number masking for security in view mode
 */

import React from 'react';
import CommonSelect from '../../../../core/common/commonSelect';
import { PermissionField } from '../../../../core/components/PermissionField';

export interface BankInfo {
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branch?: string;
  accountType?: 'Savings' | 'Current';
}

interface BankInfoSectionProps {
  bankInfo: BankInfo;
  isEditing: boolean;
  onChange: (field: string, value: any) => void;
}

// Account Type Options
const accountTypeOptions = [
  { value: 'Select', label: 'Select' },
  { value: 'Savings', label: 'Savings' },
  { value: 'Current', label: 'Current' }
];

/**
 * Mask account number for display - show only last 4 digits
 * Example: "1234567890" -> "******7890"
 */
const maskAccountNumber = (accountNumber?: string): string => {
  if (!accountNumber || accountNumber.length < 4) return 'N/A';
  const lastFour = accountNumber.slice(-4);
  const maskedLength = Math.max(accountNumber.length - 4, 6);
  return '*'.repeat(maskedLength) + lastFour;
};

/**
 * Validate IFSC code format (Indian Financial System Code)
 * Format: 4 letters (bank code) + 0 + 6 alphanumeric (branch code)
 * Example: SBIN0001234
 */
const isValidIFSC = (ifsc?: string): boolean => {
  if (!ifsc) return false;
  const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscPattern.test(ifsc.toUpperCase());
};

/**
 * Validate account number (basic validation - should be numeric and 8-18 digits)
 */
const isValidAccountNumber = (accountNumber?: string): boolean => {
  if (!accountNumber) return false;
  const accountPattern = /^\d{8,18}$/;
  return accountPattern.test(accountNumber);
};

export const BankInfoSection: React.FC<BankInfoSectionProps> = ({
  bankInfo,
  isEditing,
  onChange
}) => {
  // Validation state (at component level, not inside renderEditMode)
  const [ifscError, setIfscError] = React.useState('');
  const [accountError, setAccountError] = React.useState('');

  const renderViewMode = () => (
    <div className="border-bottom mb-4 pb-4">
      <h6 className="mb-3">Bank Information</h6>
      <div className="row">
        {/* Bank Name */}
        <PermissionField field="bankDetails.bankName" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Bank Name</label>
            <p className="mb-0 fw-medium">
              {bankInfo?.bankName || 'N/A'}
            </p>
          </div>
        </PermissionField>

        {/* Account Number (Masked) */}
        <PermissionField field="bankDetails.accountNumber" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Account Number</label>
            <p className="mb-0 fw-medium font-monospace">
              {maskAccountNumber(bankInfo?.accountNumber)}
            </p>
          </div>
        </PermissionField>

        {/* IFSC Code */}
        <PermissionField field="bankDetails.ifscCode" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">IFSC Code</label>
            <p className="mb-0 fw-medium font-monospace text-uppercase">
              {bankInfo?.ifscCode ? bankInfo.ifscCode.toUpperCase() : 'N/A'}
              {bankInfo?.ifscCode && !isValidIFSC(bankInfo.ifscCode) && (
                <span className="badge bg-warning text-dark ms-2">Invalid Format</span>
              )}
            </p>
          </div>
        </PermissionField>

        {/* Branch */}
        <PermissionField field="bankDetails.branch" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Branch</label>
            <p className="mb-0 fw-medium">
              {bankInfo?.branch || 'N/A'}
            </p>
          </div>
        </PermissionField>

        {/* Account Type */}
        <PermissionField field="bankDetails.accountType" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Account Type</label>
            <p className="mb-0 fw-medium">
              {bankInfo?.accountType || 'N/A'}
            </p>
          </div>
        </PermissionField>
      </div>
    </div>
  );

  const renderEditMode = () => {
    const validateIFSC = (value: string) => {
      if (!value) {
        setIfscError('');
        return;
      }
      const upperValue = value.toUpperCase();
      if (!isValidIFSC(upperValue)) {
        setIfscError('Invalid IFSC format (e.g., SBIN0001234)');
      } else {
        setIfscError('');
      }
      onChange('bankDetails.ifscCode', upperValue);
    };

    const validateAccountNumber = (value: string) => {
      if (!value) {
        setAccountError('');
        onChange('bankDetails.accountNumber', '');
        return;
      }
      // Remove any spaces or dashes
      const cleanValue = value.replace(/[\s-]/g, '');
      if (!/^\d+$/.test(cleanValue)) {
        setAccountError('Account number must contain only digits');
      } else if (cleanValue.length < 8 || cleanValue.length > 18) {
        setAccountError('Account number must be 8-18 digits');
      } else {
        setAccountError('');
      }
      onChange('bankDetails.accountNumber', cleanValue);
    };

    return (
      <div className="border-bottom mb-3">
        <h6 className="mb-3">Bank Information</h6>
        <div className="row">
          {/* Bank Name */}
          <PermissionField field="bankDetails.bankName" editMode={true}>
            <div className="col-md-6">
              <div className="row align-items-center mb-3">
                <div className="col-md-4">
                  <label className="form-label mb-md-0">Bank Name</label>
                </div>
                <div className="col-md-8">
                  <input
                    type="text"
                    className="form-control"
                    value={bankInfo?.bankName || ''}
                    onChange={(e) => onChange('bankDetails.bankName', e.target.value)}
                    placeholder="Enter bank name"
                  />
                </div>
              </div>
            </div>
          </PermissionField>

          {/* Account Number */}
          <PermissionField field="bankDetails.accountNumber" editMode={true}>
            <div className="col-md-6">
              <div className="row align-items-center mb-3">
                <div className="col-md-4">
                  <label className="form-label mb-md-0">Account Number *</label>
                </div>
                <div className="col-md-8">
                  <input
                    type="text"
                    className={`form-control ${accountError ? 'is-invalid' : ''}`}
                    value={bankInfo?.accountNumber || ''}
                    onChange={(e) => validateAccountNumber(e.target.value)}
                    placeholder="Enter account number (8-18 digits)"
                    maxLength={18}
                  />
                  {accountError && (
                    <div className="invalid-feedback d-block">
                      {accountError}
                    </div>
                  )}
                  <small className="text-muted">
                    Only numbers allowed, 8-18 digits
                  </small>
                </div>
              </div>
            </div>
          </PermissionField>

          {/* IFSC Code */}
          <PermissionField field="bankDetails.ifscCode" editMode={true}>
            <div className="col-md-6">
              <div className="row align-items-center mb-3">
                <div className="col-md-4">
                  <label className="form-label mb-md-0">IFSC Code *</label>
                </div>
                <div className="col-md-8">
                  <input
                    type="text"
                    className={`form-control text-uppercase ${ifscError ? 'is-invalid' : ''}`}
                    value={bankInfo?.ifscCode || ''}
                    onChange={(e) => validateIFSC(e.target.value)}
                    placeholder="e.g., SBIN0001234"
                    maxLength={11}
                    style={{ fontFamily: 'monospace' }}
                  />
                  {ifscError && (
                    <div className="invalid-feedback d-block">
                      {ifscError}
                    </div>
                  )}
                  <small className="text-muted">
                    11 characters: 4 letters + 0 + 6 alphanumeric
                  </small>
                </div>
              </div>
            </div>
          </PermissionField>

          {/* Branch */}
          <PermissionField field="bankDetails.branch" editMode={true}>
            <div className="col-md-6">
              <div className="row align-items-center mb-3">
                <div className="col-md-4">
                  <label className="form-label mb-md-0">Branch</label>
                </div>
                <div className="col-md-8">
                  <input
                    type="text"
                    className="form-control"
                    value={bankInfo?.branch || ''}
                    onChange={(e) => onChange('bankDetails.branch', e.target.value)}
                    placeholder="Enter branch name"
                  />
                </div>
              </div>
            </div>
          </PermissionField>

          {/* Account Type */}
          <PermissionField field="bankDetails.accountType" editMode={true}>
            <div className="col-md-6">
              <div className="row align-items-center mb-3">
                <div className="col-md-4">
                  <label className="form-label mb-md-0">Account Type</label>
                </div>
                <div className="col-md-8">
                  <CommonSelect
                    className="select"
                    options={accountTypeOptions}
                    defaultValue={accountTypeOptions.find(t => t.value === bankInfo?.accountType) || accountTypeOptions[0]}
                    onChange={(option: any) => onChange('bankDetails.accountType', option.value)}
                  />
                </div>
              </div>
            </div>
          </PermissionField>
        </div>

        {/* Bank Info Help Text */}
        <div className="alert alert-info mb-0" role="alert">
          <i className="ti ti-info-circle me-2"></i>
          <strong>Note:</strong> Bank details are used for salary processing and reimbursements.
          Please ensure all details are accurate.
        </div>
      </div>
    );
  };

  return isEditing ? renderEditMode() : renderViewMode();
};

export default BankInfoSection;
