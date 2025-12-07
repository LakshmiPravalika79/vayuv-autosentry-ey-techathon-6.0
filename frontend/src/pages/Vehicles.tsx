import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  TruckIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { vehiclesAPI } from '../services/api';
import type { Vehicle } from '../types';

// Demo vehicles data
const demoVehicles: Vehicle[] = [
  { id: '1', vin: 'VH001DEMO2024001', make: 'Tesla', model: 'Model S', year: 2024, mileage: 15234, status: 'ACTIVE', userId: '1', createdAt: '2024-01-15', updatedAt: '2024-01-15' },
  { id: '2', vin: 'VH002DEMO2024002', make: 'BMW', model: 'X5', year: 2023, mileage: 28456, status: 'ACTIVE', userId: '1', createdAt: '2024-01-15', updatedAt: '2024-01-15' },
  { id: '3', vin: 'VH003DEMO2024003', make: 'Mercedes', model: 'EQS', year: 2024, mileage: 8765, status: 'MAINTENANCE', userId: '1', createdAt: '2024-01-15', updatedAt: '2024-01-15' },
  { id: '4', vin: 'VH004DEMO2024004', make: 'Audi', model: 'e-tron GT', year: 2023, mileage: 32100, status: 'ACTIVE', userId: '1', createdAt: '2024-01-15', updatedAt: '2024-01-15' },
  { id: '5', vin: 'VH005DEMO2024005', make: 'Porsche', model: 'Taycan', year: 2024, mileage: 5432, status: 'ACTIVE', userId: '1', createdAt: '2024-01-15', updatedAt: '2024-01-15' },
  { id: '6', vin: 'VH006DEMO2024006', make: 'Ford', model: 'F-150 Lightning', year: 2023, mileage: 45678, status: 'INACTIVE', userId: '1', createdAt: '2024-01-15', updatedAt: '2024-01-15' },
];

const statusColors: Record<string, string> = {
  ACTIVE: 'badge-success',
  MAINTENANCE: 'badge-warning',
  INACTIVE: 'badge-danger',
};

export default function Vehicles() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: vehicles = demoVehicles, isLoading } = useQuery({
    queryKey: ['vehicles', statusFilter],
    queryFn: async () => {
      try {
        const response = await vehiclesAPI.getAll({ status: statusFilter || undefined });
        return response.data.data as Vehicle[];
      } catch {
        return demoVehicles;
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vehiclesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete vehicle');
    },
  });

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.vin.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Vehicles</h1>
          <p className="text-secondary-400">Manage your registered vehicles</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add Vehicle
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
            <input
              type="text"
              placeholder="Search by make, model, or VIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-secondary-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-40"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vehicles grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map((vehicle, index) => (
          <motion.div
            key={vehicle.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="card card-hover"
          >
            <Link to={`/vehicles/${vehicle.id}`} className="block p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-600/20 rounded-lg flex items-center justify-center">
                    <TruckIcon className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-sm text-secondary-400">{vehicle.year}</p>
                  </div>
                </div>
                <span className={`badge ${statusColors[vehicle.status]}`}>
                  {vehicle.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-400">VIN</span>
                  <span className="text-white font-mono text-xs">{vehicle.vin.slice(0, 11)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-400">Mileage</span>
                  <span className="text-white">{vehicle.mileage.toLocaleString()} mi</span>
                </div>
              </div>

              {/* Health indicator */}
              <div className="mt-4 pt-4 border-t border-secondary-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-secondary-400">Health Score</span>
                  <span className="text-sm font-medium text-success-500">
                    {Math.floor(Math.random() * 15) + 85}%
                  </span>
                </div>
                <div className="h-2 bg-secondary-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-success-500 to-success-400 rounded-full"
                    style={{ width: `${Math.floor(Math.random() * 15) + 85}%` }}
                  />
                </div>
              </div>
            </Link>

            {/* Actions */}
            <div className="px-6 pb-4 flex items-center justify-between">
              <Link
                to={`/digital-twin?vehicle=${vehicle.id}`}
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                View Digital Twin
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (confirm('Are you sure you want to delete this vehicle?')) {
                    deleteMutation.mutate(vehicle.id);
                  }
                }}
                className="text-secondary-400 hover:text-white"
              >
                <EllipsisVerticalIcon className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredVehicles.length === 0 && (
        <div className="card p-12 text-center">
          <TruckIcon className="w-12 h-12 text-secondary-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No vehicles found</h3>
          <p className="text-secondary-400 mb-4">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first vehicle'}
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            Add Vehicle
          </button>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <AddVehicleModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

function AddVehicleModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    vin: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    mileage: 0,
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => vehiclesAPI.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle added successfully');
      onClose();
    },
    onError: () => {
      toast.error('Failed to add vehicle');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-md p-6"
      >
        <h2 className="text-xl font-bold text-white mb-6">Add New Vehicle</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">VIN Number</label>
            <input
              type="text"
              value={formData.vin}
              onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
              className="input"
              placeholder="Enter 17-character VIN"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Make</label>
              <input
                type="text"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="input"
                placeholder="e.g., Tesla"
                required
              />
            </div>
            <div>
              <label className="label">Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="input"
                placeholder="e.g., Model S"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="input"
                min="1900"
                max={new Date().getFullYear() + 1}
                required
              />
            </div>
            <div>
              <label className="label">Mileage</label>
              <input
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
                className="input"
                min="0"
                required
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-outline">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 btn-primary"
            >
              {mutation.isPending ? 'Adding...' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
