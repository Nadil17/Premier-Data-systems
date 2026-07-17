import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, MessageSquare, RefreshCw, LogOut, CheckCircle, XCircle, Send } from 'lucide-react';
import { whatsappAPI } from '../../api/endpoints';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('whatsapp');

  // WhatsApp state
  const [status, setStatus] = useState<string>('checking');
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Test message state
  const [testPhone, setTestPhone] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    checkStatus();

    // Poll for status if we're waiting for QR or connecting
    const interval = setInterval(() => {
      if (status === 'connecting' || status === 'qr_ready') {
        checkStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status]);

  const checkStatus = async () => {
    try {
      const response = await whatsappAPI.getStatus();
      const data = response;
      setStatus(data.status);
      setIsConnected(data.connected);

      if (data.status === 'qr_ready') {
        fetchQrCode();
      }
    } catch (error) {
      console.error('Failed to get WhatsApp status:', error);
      setStatus('error');
      setIsConnected(false);
    }
  };

  const fetchQrCode = async () => {
    try {
      const response = await whatsappAPI.getQrImage();
      const data = response;
      if (data.qr) {
        setQrCode(data.qr);
      }
    } catch (error) {
      console.error('Failed to get QR code:', error);
    }
  };

  const handleRestart = async () => {
    setIsLoading(true);
    try {
      await whatsappAPI.restart();
      toast.success('WhatsApp bridge restarting...');
      setStatus('connecting');
      setQrCode(null);
    } catch (error) {
      toast.error('Failed to restart WhatsApp bridge');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await whatsappAPI.logout();
      toast.success('Logged out from WhatsApp');
      setStatus('connecting');
      setQrCode(null);
    } catch (error) {
      toast.error('Failed to logout');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) return;

    setIsSending(true);
    try {
      const response = await whatsappAPI.testMessage(testPhone);
      if (response.sent) {
        toast.success('Test message sent successfully');
      } else {
        toast.error('Failed to send test message');
      }
      setTestPhone('');
    } catch (error) {
      toast.error('Error sending test message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage system configuration and integrations</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'whatsapp'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
              <MessageSquare className="h-5 w-5" />
              WhatsApp Integration
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'general'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
              <SettingsIcon className="h-5 w-5" />
              General Settings
            </button>
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'whatsapp' && (
            <div className="card space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-lg font-semibold text-gray-900">WhatsApp Integration</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Connect a WhatsApp account to send automated notifications for estimates, job updates, and parts requests.
                </p>
              </div>

              {/* Status Section */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900">Connection Status</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {status === 'checking' && (
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <LoadingSpinner size="sm" /> Checking...
                        </span>
                      )}
                      {status === 'connected' && (
                        <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                          <CheckCircle className="h-4 w-4" /> Connected & Active
                        </span>
                      )}
                      {status === 'qr_ready' && (
                        <span className="flex items-center gap-1 text-sm text-yellow-600 font-medium">
                          <RefreshCw className="h-4 w-4 animate-spin" /> Waiting for QR Scan
                        </span>
                      )}
                      {(status === 'disconnected' || status === 'error') && (
                        <span className="flex items-center gap-1 text-sm text-red-600 font-medium">
                          <XCircle className="h-4 w-4" /> Disconnected
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRestart}
                      disabled={isLoading}
                      className="btn-secondary text-sm flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                      Restart Service
                    </button>
                    {isConnected && (
                      <button
                        onClick={handleLogout}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>

                {/* QR Code Display */}
                {status === 'qr_ready' && qrCode && (
                  <div className="mt-6 flex flex-col items-center justify-center p-6 bg-white rounded border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-4">
                      Scan this QR code with your WhatsApp app (Linked Devices)
                    </p>
                    <img src={qrCode} alt="WhatsApp QR Code" className="border-4 border-white shadow-sm rounded-lg" />
                    <p className="text-xs text-gray-400 mt-4 text-center">
                      QR code refreshes automatically.
                    </p>
                  </div>
                )}
              </div>

              {/* Test Message Section */}
              {isConnected && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Test Integration</h3>
                  <form onSubmit={handleTestMessage} className="flex gap-4 items-end">
                    <div className="flex-1 max-w-sm">
                      <label htmlFor="testPhone" className="label text-sm">
                        Phone Number (with country code)
                      </label>
                      <input
                        id="testPhone"
                        type="text"
                        placeholder="e.g. 94771234567"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        className="input"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSending || !testPhone}
                      className="btn-primary flex items-center gap-2"
                    >
                      {isSending ? (
                        <>
                          <LoadingSpinner size="sm" /> Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" /> Send Test
                        </>
                      )}
                    </button>
                  </form>
                  <p className="text-xs text-gray-500 mt-2">
                    Enter the number without the '+' sign. For Sri Lanka, use 94 followed by the number.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'general' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h2>
              <p className="text-gray-500">More settings coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
