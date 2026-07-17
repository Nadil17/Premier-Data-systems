import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import type { PartsHandoverResponse, Job } from '../../types';
import PartsHandoverModal from '../modals/PartsHandoverModal';
import { AlertCircle, Package } from 'lucide-react';

interface PartsHandoverSectionProps {
  job: Job;
  handovers: PartsHandoverResponse[];
  onHandoversUpdated: () => void;
}

const PartsHandoverSection: React.FC<PartsHandoverSectionProps> = ({ job, handovers, onHandoversUpdated }) => {
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState<PartsHandoverResponse | null>(null);
  
  if (!handovers || handovers.length === 0) {
    return null;
  }

  // Check if current user is involved in pending/transferred handovers
  const isPreviousEngineer = handovers.some(h => 
    h.previous_engineer_id === user?.id && h.status === 'pending'
  );
  
  const isNewEngineer = handovers.some(h => 
    h.new_engineer_id === user?.id && h.status === 'transferred'
  );
  
  const pendingHandoversCount = handovers.filter(h => 
    h.status === 'pending' || h.status === 'transferred'
  ).length;

  if (pendingHandoversCount === 0) {
    return null; // All handovers are resolved
  }

  const handleOpenModal = (handover?: PartsHandoverResponse) => {
    setSelectedHandover(handover || null);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-md shadow-sm">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Pending Parts Handover
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                There are {pendingHandoversCount} parts that need to be handed over due to job reassignment.
                {isPreviousEngineer && " You need to transfer these parts or return them to the store."}
                {isNewEngineer && " You need to confirm receipt of these parts."}
              </p>
            </div>
            <div className="mt-4">
              <div className="-mx-2 -my-1.5 flex">
                <button
                  type="button"
                  onClick={() => handleOpenModal()}
                  className="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600 flex items-center"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Manage Handovers
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <PartsHandoverModal
          job={job}
          handovers={handovers}
          selectedHandover={selectedHandover}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedHandover(null);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedHandover(null);
            onHandoversUpdated();
          }}
        />
      )}
    </>
  );
};

export default PartsHandoverSection;
