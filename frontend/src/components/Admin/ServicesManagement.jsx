import React, { useState, useEffect } from 'react';
import { servicesAPI, adminAPI } from '../../services/api';
import {
  Plus, Edit, Trash2, Search, CheckCircle, XCircle,
  Loader2, MoreVertical, Briefcase, Gavel, Scale,
  FileText, Shield, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as Icons from 'lucide-react';

const ServicesManagement = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ctaUrl, setCtaUrl] = useState('/search');
  const [savingCta, setSavingCta] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: 'Gavel',
    features: [''],
    order: 0,
    isActive: true
  });

  // Icon options for selection
  const iconOptions = [
    'Gavel', 'Scale', 'Briefcase', 'FileText', 'Shield', 'Users',
    'BookOpen', 'Award', 'Globe', 'Lock', 'Search', 'MessageSquare'
  ];

  useEffect(() => {
    fetchServices();
    // Load global Services CTA URL
    (async () => {
      try {
        const resp = await adminAPI.getSystemSetting('servicesGetStartedUrl');
        if (resp.data?.value) setCtaUrl(resp.data.value);
      } catch (_e) {
        // keep default
      }
    })();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await servicesAPI.getAllServices({ limit: 100 }); // Get all for admin
      setServices(response.data.services);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (service = null) => {
    if (service) {
      setEditingService(service);
      setFormData({
        title: service.title,
        description: service.description,
        icon: service.icon,
        features: service.features.length > 0 ? service.features : [''],
        order: service.order,
        isActive: service.isActive
      });
    } else {
      setEditingService(null);
      setFormData({
        title: '',
        description: '',
        icon: 'Gavel',
        features: [''],
        order: 0,
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const removeFeature = (index) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Filter empty features
    const cleanedData = {
      ...formData,
      features: formData.features.filter(f => f.trim() !== '')
    };

    try {
      if (editingService) {
        await servicesAPI.updateService(editingService._id, cleanedData);
        toast.success('Service updated successfully');
      } else {
        await servicesAPI.createService(cleanedData);
        toast.success('Service created successfully');
      }
      handleCloseModal();
      fetchServices();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error(error.response?.data?.message || 'Failed to save service');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;

    try {
      await servicesAPI.deleteService(id);
      toast.success('Service deleted successfully');
      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Failed to delete service');
    }
  };

  const getIcon = (iconName) => {
    const Icon = Icons[iconName] || Icons.Gavel;
    return <Icon className="h-5 w-5" />;
  };

  const saveCtaUrl = async () => {
    try {
      setSavingCta(true);
      await adminAPI.updateSystemSetting('servicesGetStartedUrl', ctaUrl);
      toast.success('Get Started URL updated');
    } catch (error) {
      console.error('Error updating CTA URL:', error);
      toast.error('Failed to update URL');
    } finally {
      setSavingCta(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-secondary-900">Services Management</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Service
        </button>
      </div>

      {/* Global CTA URL Config */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-3">Services Get Started Button</h3>
        <p className="text-sm text-secondary-600 mb-4">Set the URL for the Get Started button on the Services page. Default is <span className="font-mono">/search</span>.</p>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            type="text"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            className="flex-1 px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="/search"
          />
          <button
            onClick={saveCtaUrl}
            disabled={savingCta}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {savingCta ? 'Saving...' : 'Save URL'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Icon</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {services.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-secondary-500">
                      No services found. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  (services || []).map((service) => (
                    <tr key={service._id} className="hover:bg-secondary-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                        {service.order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-secondary-500">
                        {getIcon(service.icon)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-secondary-900">{service.title}</div>
                        <div className="text-xs text-secondary-500">{service.features.length} features</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-secondary-500 line-clamp-2 max-w-xs">{service.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${service.isActive ? 'bg-green-100 text-green-800' : 'bg-error-100 text-red-800'
                          }`}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleOpenModal(service)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(service._id)}
                          className="text-error-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-secondary-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-secondary-900">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h3>
              <button onClick={handleCloseModal} className="text-secondary-400 hover:text-secondary-500">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Icon</label>
                  <select
                    name="icon"
                    value={formData.icon}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {iconOptions.map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Features</label>
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => handleFeatureChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Feature description"
                      />
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="text-error-500 hover:text-error-700 p-2"
                        disabled={formData.features.length === 1}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addFeature}
                    className="text-sm text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add Feature
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Order</label>
                  <input
                    type="number"
                    name="order"
                    value={formData.order}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                    <span className="ml-2 text-sm text-secondary-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-secondary-300 rounded-lg text-secondary-700 hover:bg-secondary-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesManagement;
