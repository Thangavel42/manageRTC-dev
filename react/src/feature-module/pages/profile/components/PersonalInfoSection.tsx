/**
 * Personal Information Section Component
 * Displays and edits personal information: Passport, Nationality, Religion, Marital Status, etc.
 */

import React from 'react';
import CommonSelect from '../../../../core/common/commonSelect';
import { PermissionField } from '../../../../core/components/PermissionField';

export interface PersonalInfo {
  passport?: {
    number?: string;
    expiryDate?: string | null;
    country?: string;
  };
  nationality?: string;
  religion?: string;
  maritalStatus?: string;
  employmentOfSpouse?: string;
  noOfChildren?: number;
}

interface PersonalInfoSectionProps {
  personalInfo: PersonalInfo;
  isEditing: boolean;
  onChange: (field: string, value: any) => void;
}

// Options
const maritalStatusOptions = [
  { value: 'Select', label: 'Select' },
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Divorced', label: 'Divorced' },
  { value: 'Widowed', label: 'Widowed' },
  { value: 'Other', label: 'Other' }
];

const countryOptions = [
  { value: 'Select', label: 'Select' },
  { value: 'Afghanistan', label: 'Afghanistan' },
  { value: 'Albania', label: 'Albania' },
  { value: 'Algeria', label: 'Algeria' },
  { value: 'American Samoa', label: 'American Samoa' },
  { value: 'Andorra', label: 'Andorra' },
  { value: 'Angola', label: 'Angola' },
  { value: 'Anguilla', label: 'Anguilla' },
  { value: 'Antarctica', label: 'Antarctica' },
  { value: 'Antigua and Barbuda', label: 'Antigua and Barbuda' },
  { value: 'Argentina', label: 'Argentina' },
  { value: 'Armenia', label: 'Armenia' },
  { value: 'Aruba', label: 'Aruba' },
  { value: 'Australia', label: 'Australia' },
  { value: 'Austria', label: 'Austria' },
  { value: 'Azerbaijan', label: 'Azerbaijan' },
  { value: 'Bahamas', label: 'Bahamas' },
  { value: 'Bahrain', label: 'Bahrain' },
  { value: 'Bangladesh', label: 'Bangladesh' },
  { value: 'Barbados', label: 'Barbados' },
  { value: 'Belarus', label: 'Belarus' },
  { value: 'Belgium', label: 'Belgium' },
  { value: 'Belize', label: 'Belize' },
  { value: 'Benin', label: 'Benin' },
  { value: 'Bermuda', label: 'Bermuda' },
  { value: 'Bhutan', label: 'Bhutan' },
  { value: 'Bolivia', label: 'Bolivia' },
  { value: 'Bosnia and Herzegovina', label: 'Bosnia and Herzegovina' },
  { value: 'Botswana', label: 'Botswana' },
  { value: 'Brazil', label: 'Brazil' },
  { value: 'British Indian Ocean Territory', label: 'British Indian Ocean Territory' },
  { value: 'British Virgin Islands', label: 'British Virgin Islands' },
  { value: 'Brunei', label: 'Brunei' },
  { value: 'Bulgaria', label: 'Bulgaria' },
  { value: 'Burkina Faso', label: 'Burkina Faso' },
  { value: 'Burundi', label: 'Burundi' },
  { value: 'Cambodia', label: 'Cambodia' },
  { value: 'Cameroon', label: 'Cameroon' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Cape Verde', label: 'Cape Verde' },
  { value: 'Cayman Islands', label: 'Cayman Islands' },
  { value: 'Central African Republic', label: 'Central African Republic' },
  { value: 'Chad', label: 'Chad' },
  { value: 'Chile', label: 'Chile' },
  { value: 'China', label: 'China' },
  { value: 'Christmas Island', label: 'Christmas Island' },
  { value: 'Cocos (Keeling) Islands', label: 'Cocos (Keeling) Islands' },
  { value: 'Colombia', label: 'Colombia' },
  { value: 'Comoros', label: 'Comoros' },
  { value: 'Congo', label: 'Congo' },
  { value: 'Cook Islands', label: 'Cook Islands' },
  { value: 'Costa Rica', label: 'Costa Rica' },
  { value: 'Croatia', label: 'Croatia' },
  { value: 'Cuba', label: 'Cuba' },
  { value: 'Cyprus', label: 'Cyprus' },
  { value: 'Czech Republic', label: 'Czech Republic' },
  { value: 'Denmark', label: 'Denmark' },
  { value: 'Djibouti', label: 'Djibouti' },
  { value: 'Dominica', label: 'Dominica' },
  { value: 'Dominican Republic', label: 'Dominican Republic' },
  { value: 'Ecuador', label: 'Ecuador' },
  { value: 'Egypt', label: 'Egypt' },
  { value: 'El Salvador', label: 'El Salvador' },
  { value: 'Equatorial Guinea', label: 'Equatorial Guinea' },
  { value: 'Eritrea', label: 'Eritrea' },
  { value: 'Estonia', label: 'Estonia' },
  { value: 'Ethiopia', label: 'Ethiopia' },
  { value: 'Falkland Islands', label: 'Falkland Islands' },
  { value: 'Faroe Islands', label: 'Faroe Islands' },
  { value: 'Fiji', label: 'Fiji' },
  { value: 'Finland', label: 'Finland' },
  { value: 'France', label: 'France' },
  { value: 'French Guiana', label: 'French Guiana' },
  { value: 'French Polynesia', label: 'French Polynesia' },
  { value: 'Gabon', label: 'Gabon' },
  { value: 'Gambia', label: 'Gambia' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Germany', label: 'Germany' },
  { value: 'Ghana', label: 'Ghana' },
  { value: 'Gibraltar', label: 'Gibraltar' },
  { value: 'Greece', label: 'Greece' },
  { value: 'Greenland', label: 'Greenland' },
  { value: 'Grenada', label: 'Grenada' },
  { value: 'Guadeloupe', label: 'Guadeloupe' },
  { value: 'Guam', label: 'Guam' },
  { value: 'Guatemala', label: 'Guatemala' },
  { value: 'Guinea', label: 'Guinea' },
  { value: 'Guinea-Bissau', label: 'Guinea-Bissau' },
  { value: 'Guyana', label: 'Guyana' },
  { value: 'Haiti', label: 'Haiti' },
  { value: 'Honduras', label: 'Honduras' },
  { value: 'Hong Kong', label: 'Hong Kong' },
  { value: 'Hungary', label: 'Hungary' },
  { value: 'Iceland', label: 'Iceland' },
  { value: 'India', label: 'India' },
  { value: 'Indonesia', label: 'Indonesia' },
  { value: 'Iran', label: 'Iran' },
  { value: 'Iraq', label: 'Iraq' },
  { value: 'Ireland', label: 'Ireland' },
  { value: 'Israel', label: 'Israel' },
  { value: 'Italy', label: 'Italy' },
  { value: 'Jamaica', label: 'Jamaica' },
  { value: 'Japan', label: 'Japan' },
  { value: 'Jordan', label: 'Jordan' },
  { value: 'Kazakhstan', label: 'Kazakhstan' },
  { value: 'Kenya', label: 'Kenya' },
  { value: 'Kiribati', label: 'Kiribati' },
  { value: 'Kuwait', label: 'Kuwait' },
  { value: 'Kyrgyzstan', label: 'Kyrgyzstan' },
  { value: 'Laos', label: 'Laos' },
  { value: 'Latvia', label: 'Latvia' },
  { value: 'Lebanon', label: 'Lebanon' },
  { value: 'Lesotho', label: 'Lesotho' },
  { value: 'Liberia', label: 'Liberia' },
  { value: 'Libya', label: 'Libya' },
  { value: 'Liechtenstein', label: 'Liechtenstein' },
  { value: 'Lithuania', label: 'Lithuania' },
  { value: 'Luxembourg', label: 'Luxembourg' },
  { value: 'Macao', label: 'Macao' },
  { value: 'Macedonia', label: 'Macedonia' },
  { value: 'Madagascar', label: 'Madagascar' },
  { value: 'Malawi', label: 'Malawi' },
  { value: 'Malaysia', label: 'Malaysia' },
  { value: 'Maldives', label: 'Maldives' },
  { value: 'Mali', label: 'Mali' },
  { value: 'Malta', label: 'Malta' },
  { value: 'Marshall Islands', label: 'Marshall Islands' },
  { value: 'Martinique', label: 'Martinique' },
  { value: 'Mauritania', label: 'Mauritania' },
  { value: 'Mauritius', label: 'Mauritius' },
  { value: 'Mayotte', label: 'Mayotte' },
  { value: 'Mexico', label: 'Mexico' },
  { value: 'Micronesia', label: 'Micronesia' },
  { value: 'Moldova', label: 'Moldova' },
  { value: 'Monaco', label: 'Monaco' },
  { value: 'Mongolia', label: 'Mongolia' },
  { value: 'Montenegro', label: 'Montenegro' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Morocco', label: 'Morocco' },
  { value: 'Mozambique', label: 'Mozambique' },
  { value: 'Myanmar', label: 'Myanmar' },
  { value: 'Namibia', label: 'Namibia' },
  { value: 'Nauru', label: 'Nauru' },
  { value: 'Nepal', label: 'Nepal' },
  { value: 'Netherlands', label: 'Netherlands' },
  { value: 'Netherlands Antilles', label: 'Netherlands Antilles' },
  { value: 'New Caledonia', label: 'New Caledonia' },
  { value: 'New Zealand', label: 'New Zealand' },
  { value: 'Nicaragua', label: 'Nicaragua' },
  { value: 'Niger', label: 'Niger' },
  { value: 'Nigeria', label: 'Nigeria' },
  { value: 'Niue', label: 'Niue' },
  { value: 'Norfolk Island', label: 'Norfolk Island' },
  { value: 'North Korea', label: 'North Korea' },
  { value: 'Northern Mariana Islands', label: 'Northern Mariana Islands' },
  { value: 'Norway', label: 'Norway' },
  { value: 'Oman', label: 'Oman' },
  { value: 'Pakistan', label: 'Pakistan' },
  { value: 'Palau', label: 'Palau' },
  { value: 'Palestine', label: 'Palestine' },
  { value: 'Panama', label: 'Panama' },
  { value: 'Papua New Guinea', label: 'Papua New Guinea' },
  { value: 'Paraguay', label: 'Paraguay' },
  { value: 'Peru', label: 'Peru' },
  { value: 'Philippines', label: 'Philippines' },
  { value: 'Pitcairn Islands', label: 'Pitcairn Islands' },
  { value: 'Poland', label: 'Poland' },
  { value: 'Portugal', label: 'Portugal' },
  { value: 'Puerto Rico', label: 'Puerto Rico' },
  { value: 'Qatar', label: 'Qatar' },
  { value: 'Reunion', label: 'Reunion' },
  { value: 'Romania', label: 'Romania' },
  { value: 'Russian Federation', label: 'Russian Federation' },
  { value: 'Rwanda', label: 'Rwanda' },
  { value: 'Saint Helena', label: 'Saint Helena' },
  { value: 'Saint Kitts and Nevis', label: 'Saint Kitts and Nevis' },
  { value: 'Saint Lucia', label: 'Saint Lucia' },
  { value: 'Saint Pierre and Miquelon', label: 'Saint Pierre and Miquelon' },
  { value: 'Saint Vincent and the Grenadines', label: 'Saint Vincent and the Grenadines' },
  { value: 'Samoa', label: 'Samoa' },
  { value: 'San Marino', label: 'San Marino' },
  { value: 'Sao Tome and Principe', label: 'Sao Tome and Principe' },
  { value: 'Saudi Arabia', label: 'Saudi Arabia' },
  { value: 'Senegal', label: 'Senegal' },
  { value: 'Serbia', label: 'Serbia' },
  { value: 'Seychelles', label: 'Seychelles' },
  { value: 'Sierra Leone', label: 'Sierra Leone' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'Slovakia', label: 'Slovakia' },
  { value: 'Slovenia', label: 'Slovenia' },
  { value: 'Solomon Islands', label: 'Solomon Islands' },
  { value: 'Somalia', label: 'Somalia' },
  { value: 'South Africa', label: 'South Africa' },
  { value: 'South Georgia', label: 'South Georgia' },
  { value: 'South Korea', label: 'South Korea' },
  { value: 'Spain', label: 'Spain' },
  { value: 'Sri Lanka', label: 'Sri Lanka' },
  { value: 'Sudan', label: 'Sudan' },
  { value: 'Suriname', label: 'Suriname' },
  { value: 'Svalbard', label: 'Svalbard' },
  { value: 'Swaziland', label: 'Swaziland' },
  { value: 'Sweden', label: 'Sweden' },
  { value: 'Switzerland', label: 'Switzerland' },
  { value: 'Syria', label: 'Syria' },
  { value: 'Taiwan', label: 'Taiwan' },
  { value: 'Tajikistan', label: 'Tajikistan' },
  { value: 'Tanzania', label: 'Tanzania' },
  { value: 'Thailand', label: 'Thailand' },
  { value: 'Togo', label: 'Togo' },
  { value: 'Tokelau', label: 'Tokelau' },
  { value: 'Tonga', label: 'Tonga' },
  { value: 'Trinidad and Tobago', label: 'Trinidad and Tobago' },
  { value: 'Tunisia', label: 'Tunisia' },
  { value: 'Turkey', label: 'Turkey' },
  { value: 'Turkmenistan', label: 'Turkmenistan' },
  { value: 'Turks and Caicos Islands', label: 'Turks and Caicos Islands' },
  { value: 'Tuvalu', label: 'Tuvalu' },
  { value: 'Uganda', label: 'Uganda' },
  { value: 'Ukraine', label: 'Ukraine' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'United States', label: 'United States' },
  { value: 'United States Minor Outlying Islands', label: 'United States Minor Outlying Islands' },
  { value: 'Uruguay', label: 'Uruguay' },
  { value: 'Uzbekistan', label: 'Uzbekistan' },
  { value: 'Vanuatu', label: 'Vanuatu' },
  { value: 'Vatican City', label: 'Vatican City' },
  { value: 'Venezuela', label: 'Venezuela' },
  { value: 'Vietnam', label: 'Vietnam' },
  { value: 'Virgin Islands, British', label: 'Virgin Islands, British' },
  { value: 'Virgin Islands, U.S.', label: 'Virgin Islands, U.S.' },
  { value: 'Wallis and Futuna', label: 'Wallis and Futuna' },
  { value: 'Yemen', label: 'Yemen' },
  { value: 'Zambia', label: 'Zambia' },
  { value: 'Zimbabwe', label: 'Zimbabwe' }
];

export const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  personalInfo,
  isEditing,
  onChange
}) => {
  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  // Format date for input (YYYY-MM-DD)
  const formatInputDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const renderViewMode = () => (
    <div className="border-bottom mb-4 pb-4">
      <h6 className="mb-3">Personal Information</h6>
      <div className="row">
        {/* Passport No */}
        <PermissionField field="personal.passport.number" editMode={false}>
          <div className="col-md-4 mb-3">
            <label className="text-muted small">Passport Number</label>
            <p className="mb-0 fw-medium">
              {personalInfo?.passport?.number || 'N/A'}
            </p>
          </div>
        </PermissionField>

        {/* Passport Exp Date */}
        <PermissionField field="personal.passport.expiryDate" editMode={false}>
          <div className="col-md-4 mb-3">
            <label className="text-muted small">Passport Expiry Date</label>
            <p className="mb-0 fw-medium">
              {formatDate(personalInfo?.passport?.expiryDate)}
            </p>
          </div>
        </PermissionField>

        {/* Nationality */}
        <PermissionField field="personal.nationality" editMode={false}>
          <div className="col-md-4 mb-3">
            <label className="text-muted small">Nationality</label>
            <p className="mb-0 fw-medium">
              {personalInfo?.nationality || 'N/A'}
            </p>
          </div>
        </PermissionField>

        {/* Religion */}
        <PermissionField field="personal.religion" editMode={false}>
          <div className="col-md-4 mb-3">
            <label className="text-muted small">Religion</label>
            <p className="mb-0 fw-medium">
              {personalInfo?.religion || 'N/A'}
            </p>
          </div>
        </PermissionField>

        {/* Marital Status */}
        <PermissionField field="personal.maritalStatus" editMode={false}>
          <div className="col-md-4 mb-3">
            <label className="text-muted small">Marital Status</label>
            <p className="mb-0 fw-medium">
              {personalInfo?.maritalStatus || 'N/A'}
            </p>
          </div>
        </PermissionField>

        {/* Employment of Spouse */}
        <PermissionField field="personal.employmentOfSpouse" editMode={false}>
          <div className="col-md-4 mb-3">
            <label className="text-muted small">Employment of Spouse</label>
            <p className="mb-0 fw-medium">
              {personalInfo?.employmentOfSpouse || 'N/A'}
            </p>
          </div>
        </PermissionField>

        {/* No. of Children */}
        <PermissionField field="personal.noOfChildren" editMode={false}>
          <div className="col-md-4 mb-3">
            <label className="text-muted small">No. of Children</label>
            <p className="mb-0 fw-medium">
              {personalInfo?.noOfChildren ?? 'N/A'}
            </p>
          </div>
        </PermissionField>
      </div>
    </div>
  );

  const renderEditMode = () => (
    <div className="border-bottom mb-3">
      <h6 className="mb-3">Personal Information</h6>
      <div className="row">
        {/* Passport No */}
        <PermissionField field="personal.passport.number" editMode={true}>
          <div className="col-md-4">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Passport No</label>
              </div>
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  value={personalInfo?.passport?.number || ''}
                  onChange={(e) => onChange('personal.passport.number', e.target.value)}
                  placeholder="Enter passport number"
                />
              </div>
            </div>
          </div>
        </PermissionField>

        {/* Passport Exp Date */}
        <PermissionField field="personal.passport.expiryDate" editMode={true}>
          <div className="col-md-4">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Passport Exp Date</label>
              </div>
              <div className="col-md-8">
                <input
                  type="date"
                  className="form-control"
                  value={formatInputDate(personalInfo?.passport?.expiryDate)}
                  onChange={(e) => onChange('personal.passport.expiryDate', e.target.value)}
                />
              </div>
            </div>
          </div>
        </PermissionField>

        {/* Passport Country */}
        <PermissionField field="personal.passport.country" editMode={true}>
          <div className="col-md-4">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Passport Country</label>
              </div>
              <div className="col-md-8">
                <CommonSelect
                  className="select"
                  options={countryOptions}
                  defaultValue={countryOptions.find(c => c.value === personalInfo?.passport?.country) || countryOptions[0]}
                  onChange={(option: any) => onChange('personal.passport.country', option.value)}
                />
              </div>
            </div>
          </div>
        </PermissionField>

        {/* Nationality */}
        <PermissionField field="personal.nationality" editMode={true}>
          <div className="col-md-4">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Nationality</label>
              </div>
              <div className="col-md-8">
                <CommonSelect
                  className="select"
                  options={countryOptions}
                  defaultValue={countryOptions.find(c => c.value === personalInfo?.nationality) || countryOptions[0]}
                  onChange={(option: any) => onChange('personal.nationality', option.value)}
                />
              </div>
            </div>
          </div>
        </PermissionField>

        {/* Religion */}
        <PermissionField field="personal.religion" editMode={true}>
          <div className="col-md-4">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Religion</label>
              </div>
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  value={personalInfo?.religion || ''}
                  onChange={(e) => onChange('personal.religion', e.target.value)}
                  placeholder="Enter religion"
                />
              </div>
            </div>
          </div>
        </PermissionField>

        {/* Marital Status */}
        <PermissionField field="personal.maritalStatus" editMode={true}>
          <div className="col-md-4">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Marital Status</label>
              </div>
              <div className="col-md-8">
                <CommonSelect
                  className="select"
                  options={maritalStatusOptions}
                  defaultValue={maritalStatusOptions.find(s => s.value === personalInfo?.maritalStatus) || maritalStatusOptions[0]}
                  onChange={(option: any) => onChange('personal.maritalStatus', option.value)}
                />
              </div>
            </div>
          </div>
        </PermissionField>

        {/* Employment of Spouse */}
        <PermissionField field="personal.employmentOfSpouse" editMode={true}>
          <div className="col-md-4">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Employment of Spouse</label>
              </div>
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  value={personalInfo?.employmentOfSpouse || ''}
                  onChange={(e) => onChange('personal.employmentOfSpouse', e.target.value)}
                  placeholder="Employer name / Not Employed"
                />
              </div>
            </div>
          </div>
        </PermissionField>

        {/* No. of Children */}
        <PermissionField field="personal.noOfChildren" editMode={true}>
          <div className="col-md-4">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">No. of Children</label>
              </div>
              <div className="col-md-8">
                <input
                  type="number"
                  className="form-control"
                  value={personalInfo?.noOfChildren ?? 0}
                  onChange={(e) => onChange('personal.noOfChildren', parseInt(e.target.value) || 0)}
                  min="0"
                  max="50"
                />
              </div>
            </div>
          </div>
        </PermissionField>
      </div>
    </div>
  );

  return isEditing ? renderEditMode() : renderViewMode();
};

export default PersonalInfoSection;
