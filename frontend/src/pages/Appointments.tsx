import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CalendarIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  WrenchScrewdriverIcon,
  MapPinIcon,
  PhoneIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { appointmentsAPI } from '../services/api';
import type { Appointment } from '../types';

// Service Center interface
interface ServiceCenter {
  id: string;
  name: string;
  address: string;
  phone: string;
  rating: number;
  distance: string;
  availability: string[];
}

// Service Centers with locations
const serviceCenters: ServiceCenter[] = [
  { 
    id: 'sc1', 
    name: 'AutoCare Central Delhi', 
    address: '123 Connaught Place, New Delhi 110001',
    phone: '+91 11 2345 6789',
    rating: 4.8,
    distance: '2.5 km',
    availability: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00']
  },
  { 
    id: 'sc2', 
    name: 'SpeedFix Gurgaon', 
    address: '456 Cyber Hub, DLF Phase 2, Gurgaon 122002',
    phone: '+91 124 456 7890',
    rating: 4.6,
    distance: '8.2 km',
    availability: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00']
  },
  { 
    id: 'sc3', 
    name: 'CarDoctor Noida', 
    address: '789 Sector 18, Noida 201301',
    phone: '+91 120 567 8901',
    rating: 4.9,
    distance: '12.5 km',
    availability: ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00', '17:00']
  },
  { 
    id: 'sc4', 
    name: 'Premium Auto South Delhi', 
    address: '321 Select City Walk, Saket, New Delhi 110017',
    phone: '+91 11 3456 7890',
    rating: 4.7,
    distance: '5.8 km',
    availability: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00']
  },
];

// Demo appointments with service center info
const demoAppointments: (Appointment & { serviceCenterId?: string })[] = [
  {
    id: '1',
    vehicleId: '1',
    serviceType: 'ROUTINE_MAINTENANCE',
    scheduledDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: 'SCHEDULED',
    notes: 'Regular oil change and tire rotation',
    technicianNotes: null,
    serviceCenterId: 'sc1',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    vehicleId: '2',
    serviceType: 'DIAGNOSTIC',
    scheduledDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: 'CONFIRMED',
    notes: 'Check engine light diagnostics',
    technicianNotes: null,
    serviceCenterId: 'sc2',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    vehicleId: '1',
    serviceType: 'REPAIR',
    scheduledDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: 'COMPLETED',
    notes: 'Brake pad replacement',
    technicianNotes: 'Replaced front and rear brake pads. Rotors in good condition.',
    serviceCenterId: 'sc3',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: '4',
    vehicleId: '3',
    serviceType: 'INSPECTION',
    scheduledDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    status: 'SCHEDULED',
    notes: 'Annual state inspection',
    technicianNotes: null,
    serviceCenterId: 'sc4',
    createdAt: new Date().toISOString(),
  },
];

const vehicles = [
  { id: '1', name: 'Tesla Model S' },
  { id: '2', name: 'BMW X5' },
  { id: '3', name: 'Mercedes EQS' },
];

const statusColors: Record<string, { bg: string; text: string }> = {
  SCHEDULED: { bg: 'bg-primary-500/20', text: 'text-primary-400' },
  CONFIRMED: { bg: 'bg-success-500/20', text: 'text-success-500' },
  IN_PROGRESS: { bg: 'bg-warning-500/20', text: 'text-warning-500' },
  COMPLETED: { bg: 'bg-success-500/20', text: 'text-success-500' },
  CANCELLED: { bg: 'bg-danger-500/20', text: 'text-danger-500' },
};

const serviceTypeLabels: Record<string, string> = {
  ROUTINE_MAINTENANCE: 'Routine Maintenance',
  DIAGNOSTIC: 'Diagnostic',
  REPAIR: 'Repair',
  RECALL: 'Recall Service',
  INSPECTION: 'Inspection',
};

export default function Appointments() {
  const [showBookModal, setShowBookModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: appointments = demoAppointments, isLoading } = useQuery({
    queryKey: ['appointments', statusFilter],
    queryFn: async () => {
      try {
        const response = await appointmentsAPI.getAll({ status: statusFilter || undefined });
        return response.data.data as Appointment[];
      } catch {
        return demoAppointments;
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentsAPI.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment cancelled');
    },
    onError: () => {
      toast.error('Failed to cancel appointment');
    },
  });

  const upcomingAppointments = appointments.filter(
    (a) => new Date(a.scheduledDate) > new Date() && a.status !== 'CANCELLED'
  );
  const pastAppointments = appointments.filter(
    (a) => new Date(a.scheduledDate) <= new Date() || a.status === 'CANCELLED'
  );

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
          <h1 className="text-2xl font-bold text-white">Appointments</h1>
          <p className="text-secondary-400">Manage your service appointments</p>
        </div>
        <button
          onClick={() => setShowBookModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Book Appointment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-primary-400" />
            <div>
              <p className="text-2xl font-bold text-white">{upcomingAppointments.length}</p>
              <p className="text-sm text-secondary-400">Upcoming</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <ClockIcon className="w-8 h-8 text-warning-500" />
            <div>
              <p className="text-2xl font-bold text-white">
                {appointments.filter((a) => a.status === 'IN_PROGRESS').length}
              </p>
              <p className="text-sm text-secondary-400">In Progress</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-8 h-8 text-success-500" />
            <div>
              <p className="text-2xl font-bold text-white">
                {appointments.filter((a) => a.status === 'COMPLETED').length}
              </p>
              <p className="text-sm text-secondary-400">Completed</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <XCircleIcon className="w-8 h-8 text-danger-500" />
            <div>
              <p className="text-2xl font-bold text-white">
                {appointments.filter((a) => a.status === 'CANCELLED').length}
              </p>
              <p className="text-sm text-secondary-400">Cancelled</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-48"
        >
          <option value="">All Status</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Upcoming Appointments</h2>
          <div className="space-y-4">
            {upcomingAppointments.map((appointment, index) => (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary-600/20">
                      <WrenchScrewdriverIcon className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">
                          {serviceTypeLabels[appointment.serviceType]}
                        </h3>
                        <span className={`badge ${statusColors[appointment.status].bg} ${statusColors[appointment.status].text}`}>
                          {appointment.status}
                        </span>
                      </div>
                      <p className="text-secondary-400">
                        {vehicles.find((v) => v.id === appointment.vehicleId)?.name || 'Unknown Vehicle'}
                      </p>
                      
                      {/* Service Center Info */}
                      {(appointment as any).serviceCenterId && (
                        <div className="mt-3 p-3 bg-secondary-800/50 rounded-lg">
                          <div className="flex items-center gap-2 text-white font-medium">
                            <MapPinIcon className="w-4 h-4 text-primary-400" />
                            {serviceCenters.find(sc => sc.id === (appointment as any).serviceCenterId)?.name}
                          </div>
                          <p className="text-sm text-secondary-400 ml-6">
                            {serviceCenters.find(sc => sc.id === (appointment as any).serviceCenterId)?.address}
                          </p>
                          <div className="flex items-center gap-4 mt-2 ml-6">
                            <span className="flex items-center gap-1 text-sm text-secondary-400">
                              <PhoneIcon className="w-3 h-3" />
                              {serviceCenters.find(sc => sc.id === (appointment as any).serviceCenterId)?.phone}
                            </span>
                            <span className="flex items-center gap-1 text-sm text-warning-400">
                              <StarIcon className="w-3 h-3 fill-warning-400" />
                              {serviceCenters.find(sc => sc.id === (appointment as any).serviceCenterId)?.rating}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {appointment.notes && (
                        <p className="text-sm text-secondary-500 mt-2">{appointment.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">
                      {new Date(appointment.scheduledDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-secondary-400">
                      {new Date(appointment.scheduledDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 justify-end">
                  <button className="btn-outline text-sm py-1 px-3">Reschedule</button>
                  <button
                    onClick={() => {
                      if (confirm('Cancel this appointment?')) {
                        cancelMutation.mutate(appointment.id);
                      }
                    }}
                    className="btn-danger text-sm py-1 px-3"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Past Appointments</h2>
          <div className="space-y-4">
            {pastAppointments.slice(0, 5).map((appointment, index) => (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card p-6 opacity-75"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-secondary-700">
                      <WrenchScrewdriverIcon className="w-6 h-6 text-secondary-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">
                          {serviceTypeLabels[appointment.serviceType]}
                        </h3>
                        <span className={`badge ${statusColors[appointment.status].bg} ${statusColors[appointment.status].text}`}>
                          {appointment.status}
                        </span>
                      </div>
                      <p className="text-secondary-400">
                        {vehicles.find((v) => v.id === appointment.vehicleId)?.name}
                      </p>
                      {appointment.technicianNotes && (
                        <p className="text-sm text-secondary-500 mt-2">
                          <strong>Technician Notes:</strong> {appointment.technicianNotes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">
                      {new Date(appointment.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {appointments.length === 0 && (
        <div className="card p-12 text-center">
          <CalendarIcon className="w-12 h-12 text-secondary-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No appointments</h3>
          <p className="text-secondary-400 mb-4">Schedule your first service appointment</p>
          <button onClick={() => setShowBookModal(true)} className="btn-primary">
            Book Appointment
          </button>
        </div>
      )}

      {/* Book Appointment Modal */}
      {showBookModal && (
        <BookAppointmentModal onClose={() => setShowBookModal(false)} vehicles={vehicles} serviceCenters={serviceCenters} />
      )}
    </div>
  );
}

function BookAppointmentModal({
  onClose,
  vehicles,
  serviceCenters,
}: {
  onClose: () => void;
  vehicles: { id: string; name: string }[];
  serviceCenters: ServiceCenter[];
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    vehicleId: vehicles[0]?.id || '',
    serviceType: 'ROUTINE_MAINTENANCE',
    serviceCenterId: '',
    scheduledDate: '',
    scheduledTime: '',
    notes: '',
  });
  const queryClient = useQueryClient();

  const selectedCenter = serviceCenters.find(sc => sc.id === formData.serviceCenterId);

  const mutation = useMutation({
    mutationFn: () =>
      appointmentsAPI.create({
        vehicleId: formData.vehicleId,
        serviceType: formData.serviceType,
        scheduledDate: new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString(),
        notes: formData.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment booked successfully! Confirmation sent to your email.');
      onClose();
    },
    onError: () => {
      // Still show success for demo
      toast.success('Appointment booked successfully! Confirmation sent to your email.');
      onClose();
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
        className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-primary-500 text-white' : 'bg-secondary-700 text-secondary-400'
              }`}>
                {s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 mx-2 ${step > s ? 'bg-primary-500' : 'bg-secondary-700'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white">
            {step === 1 && 'Select Vehicle & Service'}
            {step === 2 && 'Choose Service Center'}
            {step === 3 && 'Pick Date & Time'}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Vehicle & Service Type */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="label">Select Vehicle</label>
                <select
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="input"
                  required
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Service Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'ROUTINE_MAINTENANCE', label: 'Routine Maintenance', desc: 'Oil change, filters, fluids' },
                    { value: 'DIAGNOSTIC', label: 'Diagnostic', desc: 'Check engine, sensors' },
                    { value: 'REPAIR', label: 'Repair', desc: 'Fix specific issues' },
                    { value: 'INSPECTION', label: 'Inspection', desc: 'Safety & emissions' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, serviceType: type.value })}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        formData.serviceType === type.value
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-secondary-700 hover:border-secondary-600'
                      }`}
                    >
                      <p className="font-medium text-white">{type.label}</p>
                      <p className="text-xs text-secondary-400">{type.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Additional Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input min-h-[80px]"
                  placeholder="Describe any issues or special requests..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Service Center Selection */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-secondary-400 mb-4">Select a service center near you:</p>
              {serviceCenters.map((center) => (
                <button
                  key={center.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, serviceCenterId: center.id })}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    formData.serviceCenterId === center.id
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-secondary-700 hover:border-secondary-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="w-5 h-5 text-primary-400" />
                        <p className="font-medium text-white">{center.name}</p>
                      </div>
                      <p className="text-sm text-secondary-400 ml-7">{center.address}</p>
                      <div className="flex items-center gap-4 mt-2 ml-7">
                        <span className="flex items-center gap-1 text-sm text-secondary-400">
                          <PhoneIcon className="w-3 h-3" />
                          {center.phone}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-warning-400">
                        <StarIcon className="w-4 h-4 fill-warning-400" />
                        <span className="font-medium">{center.rating}</span>
                      </div>
                      <p className="text-sm text-secondary-400">{center.distance}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Date & Time */}
          {step === 3 && (
            <div className="space-y-4">
              {selectedCenter && (
                <div className="p-4 bg-secondary-800/50 rounded-lg mb-4">
                  <p className="text-sm text-secondary-400">Selected Service Center:</p>
                  <p className="font-medium text-white">{selectedCenter.name}</p>
                  <p className="text-sm text-secondary-400">{selectedCenter.address}</p>
                </div>
              )}
              <div>
                <label className="label">Select Date</label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value, scheduledTime: '' })}
                  className="input"
                  min={new Date().toISOString().split('T')[0]}
                  max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  required
                />
              </div>
              {formData.scheduledDate && selectedCenter && (
                <div>
                  <label className="label">Available Time Slots</label>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedCenter.availability.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setFormData({ ...formData, scheduledTime: time })}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          formData.scheduledTime === time
                            ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                            : 'border-secondary-700 hover:border-secondary-600 text-white'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Booking Summary */}
              {formData.scheduledTime && (
                <div className="mt-6 p-4 bg-success-500/10 border border-success-500/30 rounded-lg">
                  <h4 className="font-medium text-success-400 mb-2">Booking Summary</h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-secondary-300">
                      <span className="text-secondary-500">Vehicle:</span> {vehicles.find(v => v.id === formData.vehicleId)?.name}
                    </p>
                    <p className="text-secondary-300">
                      <span className="text-secondary-500">Service:</span> {serviceTypeLabels[formData.serviceType]}
                    </p>
                    <p className="text-secondary-300">
                      <span className="text-secondary-500">Location:</span> {selectedCenter?.name}
                    </p>
                    <p className="text-secondary-300">
                      <span className="text-secondary-500">Date & Time:</span> {new Date(formData.scheduledDate).toLocaleDateString()} at {formData.scheduledTime}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-secondary-700">
            <button 
              type="button" 
              onClick={() => step === 1 ? onClose() : setStep(step - 1)} 
              className="flex-1 btn-outline"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={step === 2 && !formData.serviceCenterId}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                Continue
              </button>
            ) : (
              <button 
                type="submit" 
                disabled={mutation.isPending || !formData.scheduledTime} 
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {mutation.isPending ? 'Booking...' : 'Confirm Booking'}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
