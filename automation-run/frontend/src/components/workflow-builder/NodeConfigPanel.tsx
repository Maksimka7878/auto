import { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { NodeConfig } from '@/types';

interface NodeConfigPanelProps {
  node: Node;
  integrations?: {
    triggers: NodeConfig[];
    actions: NodeConfig[];
    logic: NodeConfig[];
  };
  onConfigChange: (config: Record<string, any>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function NodeConfigPanel({
  node,
  integrations,
  onConfigChange,
  onDelete,
  onClose,
}: NodeConfigPanelProps) {
  const [config, setConfig] = useState<Record<string, any>>(
    node.data.config || {}
  );
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonValue, setJsonValue] = useState('');

  // Find node configuration
  const allNodes = [
    ...(integrations?.triggers || []),
    ...(integrations?.actions || []),
    ...(integrations?.logic || []),
  ];
  const nodeConfig = allNodes.find((n) => n.type === node.data.nodeType);

  useEffect(() => {
    setConfig(node.data.config || {});
    setJsonValue(JSON.stringify(node.data.config || {}, null, 2));
  }, [node]);

  const handleFieldChange = (name: string, value: any) => {
    const newConfig = { ...config, [name]: value };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleJsonSave = () => {
    try {
      const parsed = JSON.parse(jsonValue);
      setConfig(parsed);
      onConfigChange(parsed);
    } catch {
      // Invalid JSON
    }
  };

  const renderField = (field: any) => {
    const value = config[field.name] ?? field.default ?? '';

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="input"
            placeholder={field.label}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="input min-h-[100px]"
            placeholder={field.label}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) =>
              handleFieldChange(field.name, parseInt(e.target.value) || 0)
            }
            className="input"
            placeholder={field.label}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="input"
          >
            <option value="">Выберите...</option>
            {field.options?.map((opt: string) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="h-4 w-4 text-primary-600 rounded"
            />
            <span className="text-sm text-gray-700">{field.label}</span>
          </label>
        );

      case 'json':
        return (
          <textarea
            value={
              typeof value === 'object' ? JSON.stringify(value, null, 2) : value
            }
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleFieldChange(field.name, parsed);
              } catch {
                handleFieldChange(field.name, e.target.value);
              }
            }}
            className="input min-h-[100px] font-mono text-sm"
            placeholder="{}"
          />
        );

      case 'cron':
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className="input font-mono"
              placeholder="0 * * * *"
            />
            <p className="text-xs text-gray-500">
              Формат: минуты часы дни месяцы дни_недели
            </p>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="input"
          />
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{node.data.label}</h3>
          <p className="text-sm text-gray-500 capitalize">
            {node.data.nodeType.replace(/_/g, ' ')}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <XMarkIcon className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Mode toggle */}
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setJsonMode(false)}
            className={`px-3 py-1 rounded ${
              !jsonMode ? 'bg-primary-100 text-primary-700' : 'text-gray-600'
            }`}
          >
            Форма
          </button>
          <button
            onClick={() => {
              setJsonMode(true);
              setJsonValue(JSON.stringify(config, null, 2));
            }}
            className={`px-3 py-1 rounded ${
              jsonMode ? 'bg-primary-100 text-primary-700' : 'text-gray-600'
            }`}
          >
            JSON
          </button>
        </div>

        {jsonMode ? (
          <div className="space-y-2">
            <textarea
              value={jsonValue}
              onChange={(e) => setJsonValue(e.target.value)}
              className="input min-h-[200px] font-mono text-sm"
            />
            <button onClick={handleJsonSave} className="btn-primary w-full">
              Применить
            </button>
          </div>
        ) : (
          <>
            {/* Node ID */}
            <div>
              <label className="label">ID узла</label>
              <input
                type="text"
                value={node.id}
                disabled
                className="input bg-gray-50 text-gray-500"
              />
            </div>

            {/* Dynamic fields */}
            {nodeConfig?.config?.map((field) => (
              <div key={field.name}>
                <label className="label">
                  {field.label || field.name}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                {renderField(field)}
              </div>
            ))}

            {/* Variable reference help */}
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-800 font-medium mb-1">
                Использование переменных
              </p>
              <p className="text-xs text-blue-700">
                Используйте <code className="bg-blue-100 px-1 rounded">{'{{nodeId.field}}'}</code> для
                ссылки на данные из других узлов
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onDelete}
          className="btn-danger w-full flex items-center justify-center gap-2"
        >
          <TrashIcon className="h-4 w-4" />
          Удалить узел
        </button>
      </div>
    </div>
  );
}
