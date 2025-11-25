import AddActivity from './add_activity';
import AddContact from './add_contact';
import AddCompany from './add_company';
import AddDeals from './add_deals';
import AddLeads from './add_leads';
import AddPipeline from './add_pipeline';
import AddStage from './add_stage';
import EditActivity from './edit_activity';
import EditCompany from './edit_company';
import EditContact from './edit_contact';
import EditDeals from './edit_deals';
import EditLeads from './edit_leads';
import EditPipeline from './edit_pipeline';
import EditStage from './edit_stage';
import PipelineAccess from './pipeline_access';
import SuccesContacts from './success_contacts';
import DeleteActivity from './delete_activity';
import DeleteModal from './deleteModal';
import { Deal } from '../../hooks/useDeals';

interface CrmsModalProps {
  selectedDeal?: Deal | null;
  onDeleteConfirm?: () => void;
}

const CrmsModal = ({ selectedDeal, onDeleteConfirm }: CrmsModalProps) => {
  return (
    <>
      <AddActivity />
      <AddContact />
      <AddCompany />
      <AddDeals />
      <AddLeads />
      <AddPipeline />
      <AddStage />
      <EditActivity />
      <EditCompany />
      <EditContact />
      <EditDeals selectedDeal={selectedDeal} />
      <EditLeads />
      <EditPipeline />
      <EditStage />
      <PipelineAccess />
      <SuccesContacts />
      <DeleteActivity />
      <DeleteModal onDeleteConfirm={onDeleteConfirm} />
    </>
  );
};

export default CrmsModal;
