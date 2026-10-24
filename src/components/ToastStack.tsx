import { Icon, type IconName } from './Icon'

export interface ToastMessage {
  id: number
  icon: IconName
  title: string
  body: string
}

export function ToastStack({ toasts }: { toasts: ToastMessage[] }) {
  return (
    <div aria-live="polite" className="toast-stack" role="status">
      {toasts.map((toast) => (
        <div className="toast" key={toast.id}>
          <span className="toast-icon">
            <Icon name={toast.icon} size={18} />
          </span>
          <div>
            <strong>{toast.title}</strong>
            <span>{toast.body}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
