import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BoltIcon,
  ClockIcon,
  CubeTransparentIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Визуальный редактор',
    description:
      'Создавайте автоматизации с помощью drag-and-drop интерфейса без единой строки кода',
    icon: CubeTransparentIcon,
  },
  {
    name: 'Множество интеграций',
    description:
      'Telegram, Slack, Email, HTTP запросы, Google Sheets и многое другое',
    icon: BoltIcon,
  },
  {
    name: 'Запуск по расписанию',
    description:
      'Настройте выполнение автоматизаций по cron-расписанию или через webhooks',
    icon: ClockIcon,
  },
  {
    name: 'Безопасность',
    description:
      'Шифрование данных, защищённые соединения и соответствие стандартам безопасности',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Высокая производительность',
    description:
      'Распределённая архитектура обеспечивает надёжное выполнение тысяч автоматизаций',
    icon: RocketLaunchIcon,
  },
  {
    name: 'Детальная аналитика',
    description:
      'Отслеживайте выполнение, анализируйте ошибки и оптимизируйте процессы',
    icon: ChartBarIcon,
  },
];

const plans = [
  {
    name: 'Free',
    price: '0',
    description: 'Для личного использования',
    features: [
      '3 автоматизации',
      '100 выполнений/месяц',
      'Базовые триггеры',
      'Базовые действия',
      'Email поддержка',
    ],
    cta: 'Начать бесплатно',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '1 990',
    description: 'Для малого бизнеса',
    features: [
      '50 автоматизаций',
      '10 000 выполнений/месяц',
      'Все триггеры',
      'Все действия',
      'Продвинутая логика',
      'Приоритетная поддержка',
      '10 ГБ хранилища',
    ],
    cta: 'Выбрать Pro',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '9 990',
    description: 'Для крупных компаний',
    features: [
      'Безлимитные автоматизации',
      'Безлимитные выполнения',
      'Все возможности',
      'Кастомные интеграции',
      'SLA 99.9%',
      'Выделенная поддержка',
      'On-premise развертывание',
    ],
    cta: 'Связаться',
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <BoltIcon className="h-8 w-8 text-primary-600" />
              <span className="font-bold text-xl">AUTOMATION.RUN</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">
                Возможности
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">
                Тарифы
              </a>
              <Link to="/login" className="text-gray-600 hover:text-gray-900">
                Войти
              </Link>
              <Link to="/register" className="btn-primary">
                Регистрация
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Автоматизируйте бизнес-процессы
              <span className="text-gradient block mt-2">без написания кода</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Создавайте мощные автоматизации с помощью визуального редактора.
              Интегрируйте сервисы, настраивайте триггеры и логику — всё в одном месте.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="btn-primary text-lg px-8 py-3"
              >
                Попробовать бесплатно
              </Link>
              <a
                href="#features"
                className="btn-secondary text-lg px-8 py-3"
              >
                Узнать больше
              </a>
            </div>
          </motion.div>

          {/* Hero Image/Demo */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-16 relative"
          >
            <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-1">
              <div className="bg-gray-900 rounded-xl p-4">
                <div className="bg-gray-800 rounded-lg aspect-video flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <BoltIcon className="h-16 w-16 mx-auto mb-4 text-primary-500" />
                    <p className="text-lg">Визуальный редактор автоматизаций</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Всё для автоматизации
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Мощные инструменты для создания любых бизнес-процессов
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.name}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Выберите свой тариф
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Начните бесплатно и масштабируйтесь по мере роста
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-primary-600 to-primary-700 text-white ring-4 ring-primary-200'
                    : 'bg-white border-2 border-gray-200'
                }`}
              >
                <h3
                  className={`text-xl font-semibold mb-2 ${
                    plan.highlighted ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm mb-4 ${
                    plan.highlighted ? 'text-primary-100' : 'text-gray-500'
                  }`}
                >
                  {plan.description}
                </p>
                <div className="mb-6">
                  <span
                    className={`text-4xl font-bold ${
                      plan.highlighted ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {plan.price} ₽
                  </span>
                  <span
                    className={
                      plan.highlighted ? 'text-primary-100' : 'text-gray-500'
                    }
                  >
                    /месяц
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckIcon
                        className={`h-5 w-5 flex-shrink-0 ${
                          plan.highlighted ? 'text-primary-200' : 'text-primary-600'
                        }`}
                      />
                      <span
                        className={
                          plan.highlighted ? 'text-primary-50' : 'text-gray-600'
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block w-full text-center py-3 px-4 rounded-lg font-medium transition-colors ${
                    plan.highlighted
                      ? 'bg-white text-primary-600 hover:bg-primary-50'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-accent-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Готовы автоматизировать свой бизнес?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Присоединяйтесь к тысячам компаний, которые уже используют AUTOMATION.RUN
          </p>
          <Link
            to="/register"
            className="inline-block bg-white text-primary-600 font-medium px-8 py-3 rounded-lg hover:bg-primary-50 transition-colors"
          >
            Начать бесплатно
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <BoltIcon className="h-6 w-6 text-primary-500" />
              <span className="font-bold text-white">AUTOMATION.RUN</span>
            </div>
            <div className="text-sm">
              © 2024 AUTOMATION.RUN. Все права защищены.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
