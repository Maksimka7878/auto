import { useState } from 'react';
import {
  BoltIcon,
  ClockIcon,
  EnvelopeIcon,
  DocumentIcon,
  ChatBubbleLeftIcon,
  GlobeAltIcon,
  TableCellsIcon,
  CircleStackIcon,
  ArrowsRightLeftIcon,
  ClockIcon as DelayIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { NodeConfig } from '@/types';

interface NodePaletteProps {
  integrations?: {
    triggers: NodeConfig[];
    actions: NodeConfig[];
    logic: NodeConfig[];
  };
}

const iconMap: Record<string, any> = {
  webhook: BoltIcon,
  clock: ClockIcon,
  mail: EnvelopeIcon,
  form: DocumentIcon,
  telegram: ChatBubbleLeftIcon,
  slack: ChatBubbleLeftIcon,
  http: GlobeAltIcon,
  sheets: TableCellsIcon,
  database: CircleStackIcon,
  condition: ArrowsRightLeftIcon,
  timer: DelayIcon,
  loop: ArrowPathIcon,
  transform: AdjustmentsHorizontalIcon,
};

const categoryColors: Record<string, string> = {
  triggers: 'bg-blue-500',
  actions: 'bg-green-500',
  logic: 'bg-purple-500',
};

const categoryLabels: Record<string, string> = {
  triggers: 'Триггеры',
  actions: 'Действия',
  logic: 'Логика',
};

export default function NodePalette({ integrations }: NodePaletteProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    triggers: true,
    actions: true,
    logic: true,
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const onDragStart = (
    event: React.DragEvent,
    nodeType: string,
    nodeName: string
  ) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.setData('application/reactflow-name', nodeName);
    event.dataTransfer.effectAllowed = 'move';
  };

  const categories = [
    { key: 'triggers', items: integrations?.triggers || [] },
    { key: 'actions', items: integrations?.actions || [] },
    { key: 'logic', items: integrations?.logic || [] },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Узлы</h3>
        <p className="text-sm text-gray-500">Перетащите на холст</p>
      </div>

      <div className="overflow-y-auto h-[calc(100%-5rem)] scrollbar-thin">
        {categories.map(({ key, items }) => (
          <div key={key} className="border-b border-gray-100 last:border-b-0">
            <button
              onClick={() => toggleCategory(key)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${categoryColors[key]}`} />
                <span className="font-medium text-gray-900">
                  {categoryLabels[key]}
                </span>
                <span className="text-xs text-gray-400">({items.length})</span>
              </div>
              {expandedCategories[key] ? (
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {expandedCategories[key] && (
              <div className="pb-2">
                {items.map((item) => {
                  const Icon = iconMap[item.icon] || BoltIcon;
                  return (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, item.type, item.name)}
                      className={clsx(
                        'mx-2 mb-1 p-3 bg-gray-50 rounded-lg cursor-grab active:cursor-grabbing',
                        'hover:bg-gray-100 transition-colors',
                        'flex items-center gap-3'
                      )}
                    >
                      <div
                        className={clsx(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          key === 'triggers' && 'bg-blue-100 text-blue-600',
                          key === 'actions' && 'bg-green-100 text-green-600',
                          key === 'logic' && 'bg-purple-100 text-purple-600'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
