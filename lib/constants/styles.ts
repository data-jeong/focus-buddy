// Unified UI Styles for Focus Buddy
// Based on Dashboard design system

export const cardStyles = {
  base: 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700',
  hover: 'hover:shadow-md transition-all duration-200',
  padding: 'p-6',
  full: 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6',
}

export const headerStyles = {
  section: 'text-lg font-semibold text-gray-900 dark:text-white',
  page: 'text-2xl font-bold text-gray-900 dark:text-white',
  widget: 'text-lg font-semibold text-gray-900 dark:text-white',
}

export const buttonStyles = {
  primary: 'px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors',
  secondary: 'px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors',
  danger: 'px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors',
  ghost: 'px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 transition-colors',
  icon: 'p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors',
}

export const inputStyles = {
  base: 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
  select: 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
  textarea: 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
}

export const listItemStyles = {
  base: 'flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group',
  active: 'flex items-start space-x-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800',
}

export const emptyStateStyles = {
  container: 'text-center py-8',
  icon: 'w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4',
  iconSize: 'h-8 w-8',
  title: 'text-base font-medium text-gray-900 dark:text-gray-100 mb-2',
  description: 'text-sm text-gray-500 dark:text-gray-400',
}

export const badgeStyles = {
  default: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400',
}

export const textStyles = {
  label: 'block text-sm font-medium text-gray-700 dark:text-gray-300',
  muted: 'text-gray-500 dark:text-gray-400',
  small: 'text-xs text-gray-500 dark:text-gray-400',
  error: 'text-sm text-red-600 dark:text-red-400',
}

export const modalStyles = {
  overlay: 'fixed inset-0 bg-black/50 z-50',
  content: 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md z-50',
  title: 'text-xl font-semibold text-gray-900 dark:text-gray-100',
}

export const animationStyles = {
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  fadeIn: 'animate-fadeIn',
  slideUp: 'animate-slideUp',
}