import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface HeatmapPoint {
  hour: number;
  day: number;
  value: number;
}

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HOURS = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22'];

// Generate mock heatmap data
const generateHeatmapData = (): HeatmapPoint[] => {
  const data: HeatmapPoint[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < HOURS.length; hour++) {
      // Higher activity during lunch (12-14) and evening (18-21)
      let base = Math.random() * 5;
      if (hour >= 4 && hour <= 6) base += 8; // lunch
      if (hour >= 10 && hour <= 13) base += 6; // evening
      if (day === 5 || day === 6) base *= 0.5; // weekend
      data.push({ hour, day, value: Math.round(base) });
    }
  }
  return data;
};

const getColor = (value: number): string => {
  if (value === 0) return '#f3f4f6';
  if (value <= 3) return '#E0DEFF';
  if (value <= 6) return '#A39BFF';
  if (value <= 10) return '#6C63FF';
  return '#4D42FF';
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: HeatmapPoint }> }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 rounded-lg p-2 shadow text-right text-sm" dir="rtl">
        <p>{DAYS[d.day]}, {HOURS[d.hour]}:00</p>
        <p className="font-bold text-primary">{d.value} שליחים</p>
      </div>
    );
  }
  return null;
};

export const CourierHeatmap: React.FC = () => {
  const data = generateHeatmapData();

  return (
    <div>
      <div className="flex gap-2 mb-3 items-center justify-end text-xs text-gray-500">
        <span>נמוך</span>
        {['#f3f4f6', '#E0DEFF', '#A39BFF', '#6C63FF', '#4D42FF'].map((c) => (
          <div key={c} className="w-4 h-4 rounded" style={{ background: c }} />
        ))}
        <span>גבוה</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="hour"
            type="number"
            domain={[0, HOURS.length - 1]}
            tickFormatter={(v) => HOURS[v] ? `${HOURS[v]}:00` : ''}
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey="day"
            type="number"
            domain={[0, 6]}
            tickFormatter={(v) => DAYS[v] || ''}
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={data} shape="square">
            {data.map((entry, i) => (
              <Cell key={i} fill={getColor(entry.value)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};
