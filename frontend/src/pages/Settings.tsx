import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  CogIcon,
  KeyIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';

export default function Settings() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
    { id: 'appearance', label: 'Appearance', icon: PaintBrushIcon },
    { id: 'integrations', label: 'Integrations', icon: CogIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-secondary-400">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:w-64 flex-shrink-0"
        >
          <div className="card p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-500/10 text-primary-400'
                    : 'text-secondary-400 hover:text-white hover:bg-secondary-800/50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1"
        >
          {activeTab === 'profile' && <ProfileSettings user={user} />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'integrations' && <IntegrationSettings />}
        </motion.div>
      </div>
    </div>
  );
}

function ProfileSettings({ user }: { user: any }) {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
    timezone: 'America/New_York',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      // In production, call API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return formData;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Profile Information</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-full bg-primary-500/20 flex items-center justify-center">
            <UserIcon className="w-10 h-10 text-primary-400" />
          </div>
          <div>
            <button type="button" className="btn-primary text-sm">
              Change Photo
            </button>
            <p className="text-sm text-secondary-500 mt-2">JPG, PNG. Max 2MB</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="label">Phone Number</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="input"
            placeholder="+1 (555) 000-0000"
          />
        </div>

        <div>
          <label className="label">Timezone</label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            className="input"
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
          </select>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function NotificationSettings() {
  const [settings, setSettings] = useState({
    emailAlerts: true,
    pushNotifications: true,
    smsAlerts: false,
    criticalAlerts: true,
    maintenanceReminders: true,
    weeklyReports: true,
    marketingEmails: false,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings({ ...settings, [key]: !settings[key] });
    toast.success('Notification preferences updated');
  };

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Notification Preferences</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-secondary-400 uppercase tracking-wider mb-4">
            Delivery Methods
          </h3>
          <div className="space-y-4">
            <ToggleItem
              label="Email Alerts"
              description="Receive notifications via email"
              enabled={settings.emailAlerts}
              onChange={() => toggleSetting('emailAlerts')}
            />
            <ToggleItem
              label="Push Notifications"
              description="Browser and mobile push notifications"
              enabled={settings.pushNotifications}
              onChange={() => toggleSetting('pushNotifications')}
            />
            <ToggleItem
              label="SMS Alerts"
              description="Text messages for critical alerts"
              enabled={settings.smsAlerts}
              onChange={() => toggleSetting('smsAlerts')}
            />
          </div>
        </div>

        <div className="border-t border-secondary-700 pt-6">
          <h3 className="text-sm font-medium text-secondary-400 uppercase tracking-wider mb-4">
            Alert Types
          </h3>
          <div className="space-y-4">
            <ToggleItem
              label="Critical Alerts"
              description="Immediate notification for critical issues"
              enabled={settings.criticalAlerts}
              onChange={() => toggleSetting('criticalAlerts')}
            />
            <ToggleItem
              label="Maintenance Reminders"
              description="Scheduled maintenance notifications"
              enabled={settings.maintenanceReminders}
              onChange={() => toggleSetting('maintenanceReminders')}
            />
            <ToggleItem
              label="Weekly Reports"
              description="Summary of vehicle health and predictions"
              enabled={settings.weeklyReports}
              onChange={() => toggleSetting('weeklyReports')}
            />
            <ToggleItem
              label="Marketing Emails"
              description="Product updates and promotional content"
              enabled={settings.marketingEmails}
              onChange={() => toggleSetting('marketingEmails')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return true;
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
      setShowChangePassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Security Settings</h2>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-secondary-800/50 rounded-lg">
            <div className="flex items-center gap-4">
              <KeyIcon className="w-6 h-6 text-primary-400" />
              <div>
                <p className="text-white font-medium">Password</p>
                <p className="text-sm text-secondary-400">Last changed 30 days ago</p>
              </div>
            </div>
            <button
              onClick={() => setShowChangePassword(!showChangePassword)}
              className="btn-outline text-sm"
            >
              Change Password
            </button>
          </div>

          {showChangePassword && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 p-4 bg-secondary-800/30 rounded-lg"
            >
              <div>
                <label className="label">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowChangePassword(false)} className="btn-outline">
                  Cancel
                </button>
                <button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                  className="btn-primary"
                >
                  {mutation.isPending ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </motion.div>
          )}

          <div className="flex items-center justify-between p-4 bg-secondary-800/50 rounded-lg">
            <div className="flex items-center gap-4">
              <DevicePhoneMobileIcon className="w-6 h-6 text-primary-400" />
              <div>
                <p className="text-white font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-secondary-400">Add an extra layer of security</p>
              </div>
            </div>
            <button className="btn-primary text-sm">
              Enable 2FA
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary-800/50 rounded-lg">
            <div className="flex items-center gap-4">
              <GlobeAltIcon className="w-6 h-6 text-primary-400" />
              <div>
                <p className="text-white font-medium">Active Sessions</p>
                <p className="text-sm text-secondary-400">3 devices currently logged in</p>
              </div>
            </div>
            <button className="text-sm text-danger-400 hover:text-danger-300">
              Sign out all devices
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Login History</h3>
        <div className="space-y-3">
          {[
            { device: 'Chrome on Windows', location: 'New York, USA', time: '2 minutes ago', current: true },
            { device: 'Safari on iPhone', location: 'New York, USA', time: '1 hour ago', current: false },
            { device: 'Firefox on MacOS', location: 'Boston, USA', time: '2 days ago', current: false },
          ].map((session, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-secondary-800/50 rounded-lg">
              <div>
                <p className="text-white">{session.device}</p>
                <p className="text-sm text-secondary-400">{session.location} • {session.time}</p>
              </div>
              {session.current && (
                <span className="px-2 py-1 text-xs bg-success-500/10 text-success-400 rounded-full">
                  Current
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const [theme, setTheme] = useState('dark');
  const [accentColor, setAccentColor] = useState('blue');
  const [fontSize, setFontSize] = useState('medium');
  const [compactMode, setCompactMode] = useState(false);
  const [animations, setAnimations] = useState(true);

  const colors = [
    { id: 'blue', color: '#3b82f6', name: 'Blue' },
    { id: 'purple', color: '#8b5cf6', name: 'Purple' },
    { id: 'green', color: '#10b981', name: 'Green' },
    { id: 'orange', color: '#f97316', name: 'Orange' },
    { id: 'pink', color: '#ec4899', name: 'Pink' },
  ];

  const handleThemeChange = (t: string) => {
    setTheme(t);
    toast.success(`Theme changed to ${t}`);
  };

  const handleColorChange = (c: string) => {
    setAccentColor(c);
    toast.success(`Accent color changed to ${colors.find(col => col.id === c)?.name}`);
  };

  const handleFontChange = (size: string) => {
    setFontSize(size);
    toast.success(`Font size changed to ${size}`);
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Appearance Settings</h2>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-sm font-medium text-secondary-400 uppercase tracking-wider mb-4">
              Theme
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {['light', 'dark', 'system'].map((t) => (
                <button
                  key={t}
                  onClick={() => handleThemeChange(t)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    theme === t
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-secondary-700 hover:border-secondary-600'
                  }`}
                >
                  <div className={`w-full h-16 rounded mb-2 ${
                    t === 'light' ? 'bg-white' : t === 'dark' ? 'bg-secondary-900' : 'bg-gradient-to-r from-white to-secondary-900'
                  }`} />
                  <p className="text-white capitalize">{t}</p>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-secondary-500">
              Note: Light theme coming soon. Currently using dark theme.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-secondary-400 uppercase tracking-wider mb-4">
              Accent Color
            </h3>
            <div className="flex gap-3">
              {colors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleColorChange(c.id)}
                  className={`w-10 h-10 rounded-full transition-transform ${
                    accentColor === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-secondary-900 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-secondary-400 uppercase tracking-wider mb-4">
              Font Size
            </h3>
            <div className="flex gap-4">
              {['small', 'medium', 'large'].map((size) => (
                <button
                  key={size}
                  onClick={() => handleFontChange(size)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    fontSize === size
                      ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                      : 'border-secondary-700 text-secondary-400 hover:border-secondary-600'
                  }`}
                >
                  <span className={size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : ''}>
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Display Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white">Compact Mode</p>
              <p className="text-sm text-secondary-400">Reduce spacing between elements</p>
            </div>
            <button
              onClick={() => {
                setCompactMode(!compactMode);
                toast.success(compactMode ? 'Compact mode disabled' : 'Compact mode enabled');
              }}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                compactMode ? 'bg-primary-500' : 'bg-secondary-700'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  compactMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white">Animations</p>
              <p className="text-sm text-secondary-400">Enable smooth transitions and animations</p>
            </div>
            <button
              onClick={() => {
                setAnimations(!animations);
                toast.success(animations ? 'Animations disabled' : 'Animations enabled');
              }}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                animations ? 'bg-primary-500' : 'bg-secondary-700'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  animations ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationSettings() {
  const [integrations, setIntegrations] = useState([
    {
      id: 'slack',
      name: 'Slack',
      description: 'Send alerts and notifications to Slack channels',
      connected: true,
      icon: '💬',
      configurable: true,
      channel: '#autosentry-alerts',
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      description: 'Integrate with Teams for collaboration',
      connected: false,
      icon: '👥',
      configurable: true,
    },
    {
      id: 'jira',
      name: 'Jira',
      description: 'Create tickets for maintenance tasks',
      connected: true,
      icon: '📋',
      configurable: true,
      project: 'AUTO-MAINT',
    },
    {
      id: 'servicenow',
      name: 'ServiceNow',
      description: 'Sync with ServiceNow ITSM',
      connected: false,
      icon: '🔧',
      configurable: true,
    },
    {
      id: 'pagerduty',
      name: 'PagerDuty',
      description: 'Critical alert escalation',
      connected: false,
      icon: '📟',
      configurable: true,
    },
    {
      id: 'obd',
      name: 'OBD-II Device',
      description: 'Connect your vehicle telematics device',
      connected: true,
      icon: '🚗',
      configurable: true,
      deviceId: 'OBD-2024-XXXX',
    },
  ]);

  const [showConfigModal, setShowConfigModal] = useState<string | null>(null);

  const toggleConnection = (id: string) => {
    setIntegrations(integrations.map(i => {
      if (i.id === id) {
        const newState = !i.connected;
        toast.success(newState ? `${i.name} connected successfully!` : `${i.name} disconnected`);
        return { ...i, connected: newState };
      }
      return i;
    }));
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Connected Integrations</h2>
        
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="flex items-center justify-between p-4 bg-secondary-800/50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{integration.icon}</span>
                <div>
                  <p className="text-white font-medium">{integration.name}</p>
                  <p className="text-sm text-secondary-400">{integration.description}</p>
                  {integration.connected && integration.channel && (
                    <p className="text-xs text-primary-400 mt-1">Channel: {integration.channel}</p>
                  )}
                  {integration.connected && integration.project && (
                    <p className="text-xs text-primary-400 mt-1">Project: {integration.project}</p>
                  )}
                  {integration.connected && integration.deviceId && (
                    <p className="text-xs text-primary-400 mt-1">Device: {integration.deviceId}</p>
                  )}
                </div>
              </div>
              {integration.connected ? (
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 text-xs bg-success-500/10 text-success-400 rounded-full">
                    Connected
                  </span>
                  <button 
                    onClick={() => setShowConfigModal(integration.id)}
                    className="text-sm text-secondary-400 hover:text-white"
                  >
                    Configure
                  </button>
                  <button 
                    onClick={() => toggleConnection(integration.id)}
                    className="text-sm text-danger-400 hover:text-danger-300"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => toggleConnection(integration.id)}
                  className="btn-primary text-sm"
                >
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-white font-medium mb-2">API Access</h3>
        <p className="text-sm text-secondary-400 mb-4">
          Generate API keys for programmatic access to AutoSentry AI
        </p>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              toast.success('API key copied to clipboard!');
            }}
            className="btn-outline text-sm"
          >
            Copy API Key
          </button>
          <button 
            onClick={() => {
              toast.success('New API key generated!');
            }}
            className="btn-primary text-sm"
          >
            Generate New Key
          </button>
        </div>
        <div className="mt-4 p-3 bg-secondary-800 rounded-lg">
          <code className="text-xs text-secondary-400 break-all">
            sk_live_autosentry_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
          </code>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-white font-medium mb-2">Webhooks</h3>
        <p className="text-sm text-secondary-400 mb-4">
          Receive real-time updates when events occur in your account
        </p>
        <button 
          onClick={() => toast.success('Webhook endpoint added!')}
          className="btn-outline text-sm"
        >
          Add Webhook Endpoint
        </button>
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-md p-6"
          >
            <h2 className="text-xl font-bold text-white mb-4">
              Configure {integrations.find(i => i.id === showConfigModal)?.name}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Notification Channel</label>
                <input type="text" className="input" placeholder="#channel-name" defaultValue="#autosentry-alerts" />
              </div>
              <div>
                <label className="label">Alert Types</label>
                <div className="space-y-2">
                  {['Critical Alerts', 'Maintenance Reminders', 'Predictions', 'System Updates'].map((type) => (
                    <label key={type} className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-secondary-600 bg-secondary-700 text-primary-600" />
                      <span className="text-sm text-white">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-6">
              <button onClick={() => setShowConfigModal(null)} className="flex-1 btn-outline">
                Cancel
              </button>
              <button 
                onClick={() => {
                  toast.success('Configuration saved!');
                  setShowConfigModal(null);
                }} 
                className="flex-1 btn-primary"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ToggleItem({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white">{label}</p>
        <p className="text-sm text-secondary-400">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-primary-500' : 'bg-secondary-700'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
