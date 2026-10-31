import React, { useState } from 'react';
import { City, User } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/Badge';
import { Sparkles, Building2, CheckCircle2, Award, Search, Filter, Eye } from 'lucide-react';

interface SwachhAssessmentWorkspaceProps {
  city: City;
  currentUser: User;
}

export const SwachhAssessmentWorkspace: React.FC<SwachhAssessmentWorkspaceProps> = ({
  city,
  currentUser
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  const participants = [
    { id: 'sw_01', name: 'Silver Springs Residential Township', category: 'Resident Welfare Association (RWA)', ward: 'Ward 11', score: 96, status: 'certified', assessor: 'Dr. Smita Kadam', certifiedDate: '2026-10-15', segRatio: '100% Door-to-Door' },
    { id: 'sw_02', name: 'Sarafa Jewellers & Food Street Association', category: 'Commercial Market Association', ward: 'Ward 1', score: 92, status: 'certified', assessor: 'Devendra Verma', certifiedDate: '2026-10-18', segRatio: 'Dual Bin Commercial' },
    { id: 'sw_03', name: 'Choithram Memorial Hospital', category: 'Healthcare Facility (Hospital)', ward: 'Ward 4', score: 98, status: 'certified', assessor: 'Rupesh Sahu', certifiedDate: '2026-10-22', segRatio: 'Biomedical & In-situ Autoclave' },
    { id: 'sw_04', name: 'Delhi Public School Nipania', category: 'Educational Institution', ward: 'Ward 14', score: 94, status: 'certified', assessor: 'Nitin Rathore', certifiedDate: '2026-10-25', segRatio: 'Zero-Waste Campus & Compost Pit' },
    { id: 'sw_05', name: 'Brilliant Convention Centre & Hotel', category: 'Hotel & Hospitality', ward: 'Ward 12', score: 89, status: 'under_review', assessor: 'Devendra Verma', certifiedDate: 'Pending Final QC', segRatio: 'Organic Waste Converter 500kg' }
  ];

  const filteredParticipants = participants.filter(p => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.ward.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
              Swachh Participant Assessment & Citizen Accreditations
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
              Swachh Survekshan Module
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Independent assessment framework for colonies, commercial markets, schools, and hospitals in {city.name}.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Assessed Entities"
          value="184"
          denominator="200 Target"
          subtitle="92% Coverage of institutional participants"
          icon={<Building2 className="w-4 h-4 text-indigo-600" />}
        />
        <StatCard
          label="Certified Clean Establishments"
          value="162"
          denominator="88% Pass Rate"
          subtitle="Score >= 85% certified in civic records"
          icon={<Award className="w-4 h-4 text-emerald-600" />}
        />
        <StatCard
          label="Under Sanitary Inspector review"
          value="14"
          denominator="8 Pending Spot"
          subtitle="Assessor inspection submitted"
          icon={<Sparkles className="w-4 h-4 text-amber-600" />}
        />
        <StatCard
          label="Average Entity Score"
          value="93.8"
          unit="/ 100"
          denominator="Grade A+"
          subtitle="Segregation, on-site composting, hygiene"
          icon={<CheckCircle2 className="w-4 h-4 text-blue-600" />}
        />
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search participant name or ward..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Annual Swachh Accreditations 2026
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Participant Entity</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Jurisdiction</th>
                <th className="px-5 py-3">Score & Protocol</th>
                <th className="px-5 py-3">Sanitary Inspector</th>
                <th className="px-5 py-3 text-right">Accreditation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParticipants.map(part => (
                <tr key={part.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-900">{part.name}</div>
                    <div className="text-[15px] text-slate-400 font-mono">Certified on: {part.certifiedDate}</div>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-700">
                    {part.category}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-600">
                    {part.ward}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-bold font-mono text-slate-900">{part.score} / 100</span>
                    <div className="text-[15px] text-emerald-700 font-mono">{part.segRatio}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {part.assessor}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <StatusBadge status={part.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
