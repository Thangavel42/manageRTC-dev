/**
 * Bank Information Section Component
 * Displays and edits bank information: Account Holder Name, Bank Name, Account Number, IFSC Code, Branch, Account Type
 * Phase 5: Now includes "Request Change" button for bank details that go through HR approval
 * Includes account number masking for security in view mode
 */

import { Button } from 'antd';
import React, { useState } from 'react';
import CommonSelect from '../../../../core/common/commonSelect';
import { PermissionField } from '../../../../core/components/PermissionField';
import { ChangeRequestModal } from '../../../../core/modals/ChangeRequestModal';

export interface BankInfo {
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branch?: string;
  accountType?: 'Savings Account' | 'Salary Account' | 'NRI Account';
}

interface BankInfoSectionProps {
  bankInfo?: BankInfo;
  isEditing: boolean;
  onChange: (field: string, value: any) => void;
  // Phase 5: Add props for change request integration
  enableChangeRequest?: boolean;
  onRequestSuccess?: () => void;
}

// Account Type Options
const accountTypeOptions = [
  { value: 'Select', label: 'Select' },
  { value: 'Savings Account', label: 'Savings Account' },
  { value: 'Salary Account', label: 'Salary Account' },
  { value: 'NRI Account', label: 'NRI Account' }
];

/**
 * Mask account number for display - show only last 4 digits
 * Example: "1234567890" -> "******7890"
 */
const maskAccountNumber = (accountNumber?: string): string => {
  if (!accountNumber || accountNumber.length < 4) return '--';
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
  onChange,
  enableChangeRequest = true,
  onRequestSuccess,
}) => {
  // Phase 5: Change request modal state
  const [changeModalVisible, setChangeModalVisible] = useState(false);
  const [selectedField, setSelectedField] = useState<{
    fieldChanged: string;
    fieldLabel: string;
    oldValue: any;
  } | null>(null);

  // Validation state
  const [ifscError, setIfscError] = useState('');
  const [accountError, setAccountError] = useState('');

  const openChangeRequestModal = (fieldChanged: string, fieldLabel: string, oldValue: any) => {
    setSelectedField({ fieldChanged, fieldLabel, oldValue });
    setChangeModalVisible(true);
  };

  const closeChangeModal = () => {
    setChangeModalVisible(false);
    setSelectedField(null);
  };

  const handleChangeRequestSuccess = () => {
    closeChangeModal();
    onRequestSuccess?.();
  };

  const renderViewMode = () => (
    <div className="border-bottom mb-4 pb-4">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <h6 className="mb-0">Bank Information</h6>
        {enableChangeRequest && (
          <Button
            type="primary"
            size="small"
            icon={<i className="ti ti-file-description me-1"></i>}
            onClick={() => openChangeRequestModal(
              'bankDetails',
              'Bank Details',
              bankInfo
            )}
          >
            Request Change
          </Button>
        )}
      </div>
      <div className="row">
        {/* Account Holder Name */}
        <PermissionField field="bankDetails.accountHolderName" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">
              Account Holder Name
              {enableChangeRequest && (
                <i className="ti ti-lock ms-1 text-muted" title="Locked - Use Request Change to update"></i>
              )}
            </label>
            <p className="mb-0 fw-medium">
              {bankInfo?.accountHolderName || '--'}
            </p>
          </div>
        </PermissionField>

        {/* Bank Name */}
        <PermissionField field="bankDetails.bankName" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">
              Bank Name
              {enableChangeRequest && (
                <i className="ti ti-lock ms-1 text-muted" title="Locked - Use Request Change to update"></i>
              )}
            </label>
            <p className="mb-0 fw-medium">
              {bankInfo?.bankName || '--'}
            </p>
          </div>
        </PermissionField>

        {/* Account Number (Masked) */}
        <PermissionField field="bankDetails.accountNumber" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">
              Account Number
              {enableChangeRequest && (
                <i className="ti ti-lock ms-1 text-muted" title="Locked - Use Request Change to update"></i>
              )}
            </label>
            <p className="mb-0 fw-medium font-monospace">
              {maskAccountNumber(bankInfo?.accountNumber)}
            </p>
          </div>
        </PermissionField>

        {/* IFSC Code */}
        <PermissionField field="bankDetails.ifscCode" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">
              IFSC Code
              {enableChangeRequest && (
                <i className="ti ti-lock ms-1 text-muted" title="Locked - Use Request Change to update"></i>
              )}
            </label>
            <p className="mb-0 fw-medium font-monospace text-uppercase">
              {bankInfo?.ifscCode ? bankInfo.ifscCode.toUpperCase() : '--'}
              {bankInfo?.ifscCode && !isValidIFSC(bankInfo.ifscCode) && (
                <span className="badge bg-warning text-dark ms-2">Invalid Format</span>
              )}
            </p>
          </div>
        </PermissionField>

        {/* Branch */}
        <PermissionField field="bankDetails.branch" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">
              Branch
              {enableChangeRequest && (
                <i className="ti ti-lock ms-1 text-muted" title="Locked - Use Request Change to update"></i>
              )}
            </label>
            <p className="mb-0 fw-medium">
              {bankInfo?.branch || '--'}
            </p>
          </div>
        </PermissionField>

        {/* Account Type */}
        <PermissionField field="bankDetails.accountType" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">
              Account Type
              {enableChangeRequest && (
                <i className="ti ti-lock ms-1 text-muted" title="Locked - Use Request Change to update"></i>
              )}
            </label>
            <p className="mb-0 fw-medium">
              {bankInfo?.accountType || '--'}
            </p>
          </div>
        </PermissionField>
      </div>

      {/* Phase 5: Change Request Info */}
      {enableChangeRequest && (
        <div className="alert alert-warning mb-0" role="alert">
          <i className="ti ti-lock me-2"></i>
          <strong>Bank details are locked for security.</strong> Use the <strong>Request Change</strong> button above to update your bank information. Changes require HR approval.
        </div>
      )}
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
          {/* Account Holder Name */}
          <PermissionField field="bankDetails.accountHolderName" editMode={true}>
            <div className="col-md-6">
              <div className="row align-items-center mb-3">
                <div className="col-md-4">
                  <label className="form-label mb-md-0">Account Holder Name</label>
                </div>
                <div className="col-md-8">
                  <input
                    type="text"
                    className="form-control"
                    value={bankInfo?.accountHolderName || ''}
                    onChange={(e) => onChange('bankDetails.accountHolderName', e.target.value)}
                    placeholder="Enter account holder name"
                  />
                </div>
              </div>
            </div>
          </PermissionField>

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

  return (
    <>
      {isEditing ? renderEditMode() : renderViewMode()}

      {/* Phase 5: Change Request Modal */}
      {selectedField && (
        <ChangeRequestModal
          visible={changeModalVisible}
          onClose={closeChangeModal}
          fieldType="bankDetails"
          fieldChanged={selectedField.fieldChanged}
          fieldLabel={selectedField.fieldLabel}
          oldValue={selectedField.oldValue}
          onSuccess={handleChangeRequestSuccess}
        />
      )}
    </>
  );
};

export default BankInfoSection;
