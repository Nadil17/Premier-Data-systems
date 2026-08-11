import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import { customersAPI } from '../../api/endpoints';
import type { CustomerCreate } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getErrorMessage } from '../../utils/apiErrors';
import toast from 'react-hot-toast';

interface CustomerFormData {
  name: string;
  company_name?: string;
  address?: string;
  phone_1: string;
  phone_2?: string;
  phone_3?: string;
  email?: string;
  email_2?: string;
  email_3?: string;
  category: 'individual' | 'company' | 'dealer';
  tax_number?: string;
  vat_number?: string;
  website?: string;
  remarks?: string;
}

const CustomerForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<CustomerFormData>();

  const category = watch('category');

  useEffect(() => {
    if (isEditMode) {
      fetchCustomer();
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const customer = await customersAPI.getById(Number(id));
      reset({
        name: customer.name,
        company_name: customer.company_name || '',
        address: customer.address || '',
        phone_1: customer.phone_1,
        phone_2: customer.phone_2 || '',
        phone_3: customer.phone_3 || '',
        email: customer.email || '',
        email_2: customer.email_2 || '',
        email_3: customer.email_3 || '',
        category: customer.category,
        tax_number: customer.tax_number || customer.vat_number || '',
        vat_number: customer.vat_number || '',
        website: customer.website || '',
        remarks: customer.remarks || '',
      });
    } catch (error) {
      toast.error('Failed to fetch customer');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    setIsSaving(true);
    try {
      const customerData: CustomerCreate = {
        ...data,
        company_name: data.company_name || undefined,
        address: data.address || undefined,
        phone_2: data.phone_2 || undefined,
        phone_3: data.phone_3 || undefined,
        email: data.email || undefined,
        email_2: data.email_2 || undefined,
        email_3: data.email_3 || undefined,
        tax_number: data.tax_number || undefined,
        vat_number: data.vat_number || undefined,
        website: data.website || undefined,
        remarks: data.remarks || undefined,
      };

      if (isEditMode) {
        await customersAPI.update(Number(id), customerData);
        toast.success('Customer updated successfully');
      } else {
        await customersAPI.create(customerData);
        toast.success('Customer created successfully');
      }
      navigate('/customers');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save customer'));
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Customer' : 'New Customer'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {isEditMode ? 'Update customer information' : 'Add a new customer to the system'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="card">
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="category" className="label">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  {...register('category', { required: 'Category is required' })}
                  className="input"
                >
                  <option value="individual">Individual</option>
                  <option value="company">Company</option>
                  <option value="dealer">Dealer</option>
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="name" className="label">
                  {category === 'individual' ? 'Full Name' : 'Contact Person'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  {...register('name', { required: 'Name is required' })}
                  className="input"
                  placeholder="Enter full name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {(category === 'company' || category === 'dealer') && (
                <div>
                  <label htmlFor="company_name" className="label">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company_name"
                    {...register('company_name')}
                    className="input"
                    placeholder="Enter company name"
                  />
                </div>
              )}

              <div>
                <label htmlFor="tax_number" className="label font-semibold text-gray-800">
                  Tax Number
                </label>
                <input
                  type="text"
                  id="tax_number"
                  {...register('tax_number')}
                  className="input border-blue-200 focus:border-blue-500"
                  placeholder="Enter Tax Number (e.g. TAX-12345)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If entered, 18% Tax Value will be displayed separately on estimates.
                </p>
              </div>

              {(category === 'company' || category === 'dealer') && (
                <div>
                  <label htmlFor="vat_number" className="label">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    id="vat_number"
                    {...register('vat_number')}
                    className="input"
                    placeholder="Enter VAT number"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="phone_1" className="label">
                  Primary Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone_1"
                  {...register('phone_1', {
                    required: 'Primary phone is required',
                    pattern: {
                      value: /^[0-9+\-\s()]+$/,
                      message: 'Invalid phone number',
                    },
                  })}
                  className="input"
                  placeholder="+1 234 567 8900"
                />
                {errors.phone_1 && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone_1.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone_2" className="label">
                  Secondary Phone
                </label>
                <input
                  type="tel"
                  id="phone_2"
                  {...register('phone_2')}
                  className="input"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div>
                <label htmlFor="phone_3" className="label">
                  Additional Phone
                </label>
                <input
                  type="tel"
                  id="phone_3"
                  {...register('phone_3')}
                  className="input"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div>
                <label htmlFor="email" className="label">
                  Primary Email
                </label>
                <input
                  type="email"
                  id="email"
                  {...register('email', {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  className="input"
                  placeholder="customer@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email_2" className="label">
                  Secondary Email
                </label>
                <input
                  type="email"
                  id="email_2"
                  {...register('email_2', {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  className="input"
                  placeholder="secondary@example.com"
                />
                {errors.email_2 && (
                  <p className="mt-1 text-sm text-red-600">{errors.email_2.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email_3" className="label">
                  Additional Email
                </label>
                <input
                  type="email"
                  id="email_3"
                  {...register('email_3', {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  className="input"
                  placeholder="additional@example.com"
                />
                {errors.email_3 && (
                  <p className="mt-1 text-sm text-red-600">{errors.email_3.message}</p>
                )}
              </div>

              {(category === 'company' || category === 'dealer') && (
                <div>
                  <label htmlFor="website" className="label">
                    Website
                  </label>
                  <input
                    type="url"
                    id="website"
                    {...register('website')}
                    className="input"
                    placeholder="https://www.example.com"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
            <div>
              <label htmlFor="address" className="label">
                Full Address
              </label>
              <textarea
                id="address"
                {...register('address')}
                rows={3}
                className="input"
                placeholder="Enter full address"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label htmlFor="remarks" className="label">
              Remarks
            </label>
            <textarea
              id="remarks"
              {...register('remarks')}
              rows={3}
              className="input"
              placeholder="Any additional notes or remarks"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="btn-secondary"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" />
                  Saving...
                </>
              ) : isEditMode ? (
                'Update Customer'
              ) : (
                'Create Customer'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CustomerForm;
