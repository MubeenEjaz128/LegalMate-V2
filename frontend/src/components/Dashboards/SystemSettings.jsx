import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { XCircle, RefreshCw, Save } from 'lucide-react';

const SystemSettings = ({ onClose }) => {
  const [settings, setSettings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState({});

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/system-settings');
      setSettings(res.data);
      setEditValues(res.data.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {}));
    } catch (error) {
      toast.error('Failed to fetch system settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key, value) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      await api.post(`/admin/system-settings/${key}`, { value: editValues[key] });
      toast.success('Setting updated');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to update setting');
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <div>
            <h2 className="text-2xl font-bold text-secondary-900">System Settings</h2>
            <p className="text-secondary-600">Manage global system settings</p>
          </div>
          <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600 transition-colors">
            <XCircle className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <button onClick={fetchSettings} disabled={isLoading} className="btn-outline mb-4 flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : settings.length === 0 ? (
            <div className="text-center py-8 text-secondary-500">No system settings found.</div>
          ) : (
            <div className="space-y-6">
              {settings.map((setting) => (
                <div key={setting.key} className="flex items-center gap-4 border-b pb-4">
                  <div className="w-1/3 font-medium text-secondary-800">{setting.key}</div>
                  <input
                    className="input-field flex-1"
                    value={editValues[setting.key] ?? ''}
                    onChange={e => handleChange(setting.key, e.target.value)}
                  />
                  <button
                    onClick={() => handleSave(setting.key)}
                    disabled={saving[setting.key]}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" /> Save
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;