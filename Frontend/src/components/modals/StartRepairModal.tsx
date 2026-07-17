import { useState, useEffect } from 'react';
import { X, Wrench, AlertCircle, Search } from 'lucide-react';
import { jobsAPI, usersAPI } from '../../api/endpoints';
import type { User } from '../../types';

interface StartRepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: number;
  currentEngineerId?: number;
  onSuccess: () => void;
}

export function StartRepairModal({
  isOpen,
  onClose,
  jobId,
  currentEngineerId,
  onSuccess
}: StartRepairModalProps) {
  const [engineers, setEngineers] = useState<User[]>([]);
  const [selectedEngineerId, setSelectedEngineerId] = useState<number | undefined>(currentEngineerId);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadEngineers();
      setSelectedEngineerId(currentEngineerId);
      setSearchTerm('');
      setError(null);
    }
  }, [isOpen, currentEngineerId]);

  const loadEngineers = async () => {
    try {
      const response = await usersAPI.getAll(0, 100, 'engineer');
      setEngineers(response.items);
    } catch (err: any) {
      setError('Failed to load engineers.');
      console.error(err);
    }
  };

  const filteredEngineers = engineers.filter(emp =>
    (emp.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      if (!selectedEngineerId) {
        setError('Please select an engineer.');
        return;
      }
      await jobsAPI.startRepair(jobId, selectedEngineerId);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start repair.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wrench className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Start Repair Phase</h3>
                <p className="text-sm text-gray-500">Approve estimate and begin repair</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="mb-5 space-y-4">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700">
                Starting the repair phase will make the customer estimate visible to the assigned engineer and change the job status to <strong>Repair In Progress</strong>.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Engineer
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search engineers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {filteredEngineers.length === 0 ? (
                  <div className="p-3 text-center text-sm text-gray-500">
                    No engineers found
                  </div>
                ) : (
                  filteredEngineers.map((engineer) => (
                    <label
                      key={engineer.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${(selectedEngineerId || 0) === engineer.id ? 'bg-blue-50/50' : ''}`}
                    >
                      <input
                        type="radio"
                        name="engineer"
                        value={engineer.id}
                        checked={(selectedEngineerId || 0) === engineer.id}
                        onChange={() => setSelectedEngineerId(engineer.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {engineer.full_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {engineer.email}
                        </p>
                      </div>
                      {engineer.id === currentEngineerId && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Current
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !(selectedEngineerId || 0)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                'Start Repairing'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
