'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Bell,
  PlusCircle,
  Trash2,
  AlertCircle,
  Info,
  AlertTriangle,
  Megaphone,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'info' | 'warning' | 'alert'>('info');

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/announcements');
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.announcements || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error('Title and message are required');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          priority,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Announcement broadcasted to all staff!');
      setTitle('');
      setMessage('');
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.message || 'Error posting announcement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-28 pt-2 px-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">
          Broadcast Announcements
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Post notices, special meal menus, or catering advisories to staff user dashboards
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleCreate}
            className="bg-white p-6 rounded-3xl border border-[#F5E6D3] shadow-sm space-y-4"
          >
            <h3 className="font-extrabold text-sm text-[#1A1A2E] flex items-center gap-2">
              <Megaphone size={16} className="text-[#E67E22]" />
              <span>Create Announcement</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Notice Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Special Christmas Lunch Menu"
                className="w-full p-2.5 bg-[#FFF8F0] border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-bold text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Notice Message *
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your announcement details here..."
                className="w-full p-2.5 bg-[#FFF8F0] border border-[#F5E6D3] rounded-2xl text-xs text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Priority
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPriority('info')}
                  className={`py-2 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                    priority === 'info'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  <Info size={12} />
                  <span>Info</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('warning')}
                  className={`py-2 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                    priority === 'warning'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  <AlertTriangle size={12} />
                  <span>Notice</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('alert')}
                  className={`py-2 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                    priority === 'alert'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  <AlertCircle size={12} />
                  <span>Urgent</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-[#1A1A2E] hover:bg-black text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2 active:scale-95"
            >
              <PlusCircle size={16} />
              <span>{saving ? 'Posting...' : 'Publish Announcement'}</span>
            </button>
          </form>
        </div>

        {/* Existing Announcements */}
        <div className="lg:col-span-7">
          <div className="bg-white p-6 rounded-3xl border border-[#F5E6D3] shadow-sm">
            <h3 className="font-extrabold text-sm text-[#1A1A2E] mb-4">
              Active Broadcasts
            </h3>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-500">Loading notices...</div>
            ) : announcements.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No active announcements.</p>
            ) : (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div
                    key={a._id}
                    className="p-4 rounded-2xl bg-[#FFF8F0]/70 border border-[#F5E6D3] flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-extrabold text-sm text-[#1A1A2E]">
                          {a.title}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                            a.priority === 'alert'
                              ? 'bg-red-100 text-red-700'
                              : a.priority === 'warning'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {a.priority}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{a.message}</p>
                      <span className="text-[10px] text-gray-400 block mt-2">
                        Posted {format(new Date(a.createdAt), 'MMM d, yyyy • h:mm a')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

