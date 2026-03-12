import React from 'react';

interface LegendItem {
  color: string;
  label: string;
  count: number;
}

interface MapLegendProps {
  items: LegendItem[];
}

export const MapLegend: React.FC<MapLegendProps> = ({ items }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 absolute top-4 right-4 z-10">
      <h3 className="font-semibold text-sm mb-3 text-gray-700">Legend</h3>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-700">{item.label}</span>
            </div>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
